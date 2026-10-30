import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import { AIInvestigationService } from '../../services/ai-investigation.service.js';
import { rateLimit } from '../../middleware/rate-limit.middleware.js';
import {
  AlertFilterQuerySchema,
  AlertStatusUpdateSchema,
  AlertAssignmentSchema,
  InvestigationNoteSchema
} from '../../schemas/index.js';
import { env } from '../../config/env.js';

export const alertsRouter = Router();

// List alerts
alertsRouter.get(
  '/alerts',
  requireAuth,
  requireOrgMember('viewer'),
  validateQuery(AlertFilterQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { page = 1, limit = 20, search, severity, status, category, sortOrder = 'desc' } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);

    try {
      const data = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const conditions: string[] = ['a.organization_id = $1'];
          const params: unknown[] = [req.organization!.id];
          let paramIdx = 2;

          if (search) {
            conditions.push(`(a.title ILIKE $${paramIdx} OR a.description ILIKE $${paramIdx} OR a.rule_code ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
          }

          if (severity) {
            conditions.push(`a.severity = $${paramIdx}`);
            params.push(severity);
            paramIdx++;
          }

          if (status) {
            conditions.push(`a.status = $${paramIdx}`);
            params.push(status);
            paramIdx++;
          }

          if (category) {
            conditions.push(`a.category = $${paramIdx}`);
            params.push(category);
            paramIdx++;
          }

          const whereClause = conditions.join(' AND ');
          const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

          const countRes = await client.query(
            `SELECT COUNT(*) as total FROM security_alerts a WHERE ${whereClause}`,
            params
          );
          const total = parseInt(countRes.rows[0].total, 10);

          const listRes = await client.query(
            `SELECT a.id, a.event_id as "eventId", a.rule_code as "ruleCode",
                    a.title, a.description, a.category, a.severity, a.risk_score as "riskScore",
                    a.status, a.assigned_to as "assignedTo", u.full_name as "assignedToName",
                    a.resolved_at as "resolvedAt", a.created_at as "createdAt", a.updated_at as "updatedAt"
             FROM security_alerts a
             LEFT JOIN users u ON u.id = a.assigned_to
             WHERE ${whereClause}
             ORDER BY a.created_at ${orderDir}
             LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
            [...params, Number(limit), offset]
          );

          return {
            items: listRes.rows,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total,
              totalPages: Math.ceil(total / Number(limit)),
            },
          };
        }
      );

      res.json({
        success: true,
        data: data.items,
        meta: data.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Alert statistics
alertsRouter.get(
  '/alerts/stats',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const totalRes = await client.query(
            'SELECT COUNT(*) as total FROM security_alerts WHERE organization_id = $1',
            [req.organization!.id]
          );

          const openRes = await client.query(
            "SELECT COUNT(*) as total FROM security_alerts WHERE organization_id = $1 AND status = 'open'",
            [req.organization!.id]
          );

          const criticalRes = await client.query(
            "SELECT COUNT(*) as total FROM security_alerts WHERE organization_id = $1 AND severity = 'critical' AND status != 'resolved'",
            [req.organization!.id]
          );

          const resolvedRes = await client.query(
            "SELECT COUNT(*) as total FROM security_alerts WHERE organization_id = $1 AND status = 'resolved'",
            [req.organization!.id]
          );

          const bySeverityRes = await client.query(
            `SELECT severity, COUNT(*) as count
             FROM security_alerts
             WHERE organization_id = $1
             GROUP BY severity`,
            [req.organization!.id]
          );

          const byStatusRes = await client.query(
            `SELECT status, COUNT(*) as count
             FROM security_alerts
             WHERE organization_id = $1
             GROUP BY status`,
            [req.organization!.id]
          );

          return {
            total: parseInt(totalRes.rows[0].total, 10),
            open: parseInt(openRes.rows[0].total, 10),
            critical: parseInt(criticalRes.rows[0].total, 10),
            resolved: parseInt(resolvedRes.rows[0].total, 10),
            bySeverity: bySeverityRes.rows.map(r => ({ severity: r.severity, count: parseInt(r.count, 10) })),
            byStatus: byStatusRes.rows.map(r => ({ status: r.status, count: parseInt(r.count, 10) })),
          };
        }
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get alert details
alertsRouter.get(
  '/alerts/:id',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alert = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const alertRes = await client.query(
            `SELECT a.id, a.event_id as "eventId", a.rule_code as "ruleCode",
                    a.title, a.description, a.category, a.severity, a.risk_score as "riskScore",
                    a.evidence, a.recommended_actions as "recommendedActions",
                    a.status, a.assigned_to as "assignedTo", u.full_name as "assignedToName",
                    a.resolved_at as "resolvedAt", a.created_at as "createdAt", a.updated_at as "updatedAt"
             FROM security_alerts a
             LEFT JOIN users u ON u.id = a.assigned_to
             WHERE a.id = $1 AND a.organization_id = $2`,
            [req.params.id, req.organization!.id]
          );

          if (alertRes.rows.length === 0) return null;
          const alertData = alertRes.rows[0];

          // Fetch associated event
          let eventData = null;
          if (alertData.eventId) {
            const evRes = await client.query(
              `SELECT id, event_type as "eventType", source, source_event_id as "sourceEventId",
                      actor_identifier as "actorIdentifier", source_ip as "sourceIp",
                      occurred_at as "occurredAt", sanitized_payload as "sanitizedPayload"
               FROM security_events
               WHERE id = $1 AND organization_id = $2`,
              [alertData.eventId, req.organization!.id]
            );
            if (evRes.rows.length > 0) eventData = evRes.rows[0];
          }

          // Fetch investigation notes
          const notesRes = await client.query(
            `SELECT n.id, n.note, n.created_at as "createdAt", u.full_name as "authorName"
             FROM alert_notes n
             JOIN users u ON u.id = n.author_id
             WHERE n.alert_id = $1 AND n.organization_id = $2
             ORDER BY n.created_at ASC`,
            [alertData.id, req.organization!.id]
          );

          // Fetch latest AI analysis runs
          const aiRunsRes = await client.query(
            `SELECT id, model_name as "modelName", analysis_type as "analysisType",
                    prompt_version as "promptVersion", output, status, latency_ms as "latencyMs",
                    created_at as "createdAt", completed_at as "completedAt"
             FROM ai_analysis_runs
             WHERE alert_id = $1 AND organization_id = $2
             ORDER BY created_at DESC
             LIMIT 5`,
            [alertData.id, req.organization!.id]
          );

          return {
            ...alertData,
            event: eventData,
            notes: notesRes.rows,
            aiRuns: aiRunsRes.rows,
          };
        }
      );

      if (!alert) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found' } });
        return;
      }

      res.json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update alert status (open -> acknowledged -> investigating -> resolved -> false_positive)
alertsRouter.patch(
  '/alerts/:id/status',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(AlertStatusUpdateSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { status, reason } = req.body;

    try {
      const updated = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const currentRes = await client.query(
            'SELECT status FROM security_alerts WHERE id = $1 AND organization_id = $2',
            [req.params.id, req.organization!.id]
          );

          if (currentRes.rows.length === 0) {
            throw new Error('Alert not found');
          }

          const oldStatus = currentRes.rows[0].status;

          const isResolved = status === 'resolved' || status === 'false_positive';

          const updateRes = await client.query(
            `UPDATE security_alerts
             SET status = $1,
                 resolved_at = CASE WHEN $2::boolean THEN NOW() ELSE NULL END,
                 updated_at = NOW()
             WHERE id = $3 AND organization_id = $4
             RETURNING id, status, resolved_at as "resolvedAt", updated_at as "updatedAt"`,
            [status, isResolved, req.params.id, req.organization!.id]
          );

          // If reason provided, add an investigation note
          if (reason) {
            await client.query(
              `INSERT INTO alert_notes (organization_id, alert_id, author_id, note)
               VALUES ($1, $2, $3, $4)`,
              [req.organization!.id, req.params.id, req.user!.id, `Status changed to ${status}: ${reason}`]
            );
          }

          // Record audit log
          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'alert.status_updated',
            resourceType: 'security_alert',
            resourceId: req.params.id,
            metadata: { oldStatus, newStatus: status, reason },
          });

          return updateRes.rows[0];
        }
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Assign alert to an analyst
alertsRouter.patch(
  '/alerts/:id/assignment',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(AlertAssignmentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { assignedTo } = req.body;

    try {
      const updated = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const updateRes = await client.query(
            `UPDATE security_alerts
             SET assigned_to = $1, updated_at = NOW()
             WHERE id = $2 AND organization_id = $3
             RETURNING id, assigned_to as "assignedTo", updated_at as "updatedAt"`,
            [assignedTo || null, req.params.id, req.organization!.id]
          );

          if (updateRes.rows.length === 0) {
            throw new Error('Alert not found');
          }

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'alert.assignment_updated',
            resourceType: 'security_alert',
            resourceId: req.params.id,
            metadata: { assignedTo },
          });

          return updateRes.rows[0];
        }
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Add investigation note
alertsRouter.post(
  '/alerts/:id/notes',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(InvestigationNoteSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { note } = req.body;

    try {
      const createdNote = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `INSERT INTO alert_notes (organization_id, alert_id, author_id, note)
             VALUES ($1, $2, $3, $4)
             RETURNING id, note, created_at as "createdAt"`,
            [req.organization!.id, req.params.id, req.user!.id, note]
          );

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'alert.note_added',
            resourceType: 'security_alert',
            resourceId: req.params.id,
            metadata: { noteLength: note.length },
          });

          return {
            ...res.rows[0],
            authorName: req.user!.fullName,
          };
        }
      );

      res.status(201).json({
        success: true,
        data: createdNote,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Request Gemini AI Investigation
alertsRouter.post(
  '/alerts/:id/analyze',
  requireAuth,
  requireOrgMember('analyst'),
  rateLimit(env.AI_RATE_LIMIT, 60000, 'ai_analysis'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          // Fetch alert
          const alertRes = await client.query(
            `SELECT id, event_id as "eventId", rule_code as "ruleCode", title, description,
                    category, severity, risk_score as "riskScore", evidence, recommended_actions as "recommendedActions"
             FROM security_alerts
             WHERE id = $1 AND organization_id = $2`,
            [req.params.id, req.organization!.id]
          );

          if (alertRes.rows.length === 0) {
            throw new Error('Alert not found');
          }

          const alertData = alertRes.rows[0];

          // Fetch event if available
          let eventData = null;
          if (alertData.eventId) {
            const evRes = await client.query(
              `SELECT event_type as "eventType", source, actor_identifier as "actorIdentifier",
                      source_ip as "sourceIp", occurred_at as "occurredAt", sanitized_payload as "sanitizedPayload"
               FROM security_events
               WHERE id = $1 AND organization_id = $2`,
              [alertData.eventId, req.organization!.id]
            );
            if (evRes.rows.length > 0) eventData = evRes.rows[0];
          }

          // Run AI Investigation Service
          const aiResult = await AIInvestigationService.investigateAlert(client, {
            organizationId: req.organization!.id,
            userId: req.user!.id,
            alertId: alertData.id,
            alert: alertData,
            event: eventData,
          });

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'ai.investigation_requested',
            resourceType: 'security_alert',
            resourceId: alertData.id,
            metadata: {
              model: aiResult.modelName,
              latencyMs: aiResult.latencyMs,
              isSimulated: aiResult.isSimulated,
            },
          });

          return aiResult;
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

