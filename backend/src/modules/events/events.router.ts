import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validation.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { DetectionEngineService, SecurityEventInput } from '../../services/detection-engine.service.js';
import { RedactionService } from '../../services/redaction.service.js';
import { ImportParserService } from '../../services/import-parser.service.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import { SecurityEventSchema, EventFilterQuerySchema } from '../../schemas/index.js';
import { env } from '../../config/env.js';

// Restrict upload to in-memory processing only with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
  },
  fileFilter: (req, file, cb) => {
    const isCsv = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
    const isJson = file.mimetype === 'application/json' || file.originalname.endsWith('.json');
    if (isCsv || isJson) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON file formats are supported.'));
    }
  },
});

export const eventsRouter = Router();

// List events with search, pagination, and date filtering
eventsRouter.get(
  '/events',
  requireAuth,
  requireOrgMember('viewer'),
  validateQuery(EventFilterQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { page = 1, limit = 20, search, eventType, source, startDate, endDate, sortOrder = 'desc' } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);

    try {
      const data = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const conditions: string[] = ['organization_id = $1'];
          const params: unknown[] = [req.organization!.id];
          let paramIdx = 2;

          if (search) {
            conditions.push(`(event_type ILIKE $${paramIdx} OR actor_identifier ILIKE $${paramIdx} OR source ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
          }

          if (eventType) {
            conditions.push(`event_type = $${paramIdx}`);
            params.push(eventType);
            paramIdx++;
          }

          if (source) {
            conditions.push(`source = $${paramIdx}`);
            params.push(source);
            paramIdx++;
          }

          if (startDate) {
            conditions.push(`occurred_at >= $${paramIdx}`);
            params.push(startDate);
            paramIdx++;
          }

          if (endDate) {
            conditions.push(`occurred_at <= $${paramIdx}`);
            params.push(endDate);
            paramIdx++;
          }

          const whereClause = conditions.join(' AND ');
          const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

          // Count total
          const countRes = await client.query(
            `SELECT COUNT(*) as total FROM security_events WHERE ${whereClause}`,
            params
          );
          const total = parseInt(countRes.rows[0].total, 10);

          // Fetch items
          const listRes = await client.query(
            `SELECT id, organization_id, event_type as "eventType", source,
                    source_event_id as "sourceEventId", actor_identifier as "actorIdentifier",
                    source_ip as "sourceIp", occurred_at as "occurredAt",
                    sanitized_payload as "sanitizedPayload", privacy_scanned as "privacyScanned",
                    ingestion_source as "ingestionSource", created_at as "createdAt"
             FROM security_events
             WHERE ${whereClause}
             ORDER BY occurred_at ${orderDir}
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

// Event statistics for telemetry charts
eventsRouter.get(
  '/events/stats',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const totalRes = await client.query(
            'SELECT COUNT(*) as total FROM security_events WHERE organization_id = $1',
            [req.organization!.id]
          );

          const bySourceRes = await client.query(
            `SELECT source, COUNT(*) as count
             FROM security_events
             WHERE organization_id = $1
             GROUP BY source
             ORDER BY count DESC
             LIMIT 10`,
            [req.organization!.id]
          );

          const byTypeRes = await client.query(
            `SELECT event_type as "eventType", COUNT(*) as count
             FROM security_events
             WHERE organization_id = $1
             GROUP BY event_type
             ORDER BY count DESC
             LIMIT 10`,
            [req.organization!.id]
          );

          return {
            total: parseInt(totalRes.rows[0].total, 10),
            bySource: bySourceRes.rows.map(r => ({ source: r.source, count: parseInt(r.count, 10) })),
            byType: byTypeRes.rows.map(r => ({ eventType: r.eventType, count: parseInt(r.count, 10) })),
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

// Get single event details
eventsRouter.get(
  '/events/:id',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const eventRes = await client.query(
            `SELECT id, organization_id, event_type as "eventType", source,
                    source_event_id as "sourceEventId", actor_identifier as "actorIdentifier",
                    source_ip as "sourceIp", occurred_at as "occurredAt",
                    sanitized_payload as "sanitizedPayload", privacy_scanned as "privacyScanned",
                    ingestion_source as "ingestionSource", created_at as "createdAt"
             FROM security_events
             WHERE id = $1 AND organization_id = $2`,
            [req.params.id, req.organization!.id]
          );

          if (eventRes.rows.length === 0) return null;
          const event = eventRes.rows[0];

          // Fetch associated alerts
          const alertsRes = await client.query(
            `SELECT id, rule_code as "ruleCode", title, severity, risk_score as "riskScore",
                    status, created_at as "createdAt"
             FROM security_alerts
             WHERE event_id = $1 AND organization_id = $2`,
            [event.id, req.organization!.id]
          );

          return {
            ...event,
            alerts: alertsRes.rows,
          };
        }
      );

      if (!result) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Ingest single event manually
eventsRouter.post(
  '/events',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(SecurityEventSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const body = req.body;

    try {
      // 1. Redact payload before storing
      const sanitizedPayload = RedactionService.redactObject(body.sanitizedPayload || {});
      const description = body.description ? RedactionService.redactText(body.description).redactedText : '';

      const created = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          // Fetch recent events for context
          const recentRes = await client.query(
            `SELECT id, event_type as "eventType", source, actor_identifier as "actorIdentifier",
                    source_ip as "sourceIp", occurred_at as "occurredAt", sanitized_payload as "sanitizedPayload"
             FROM security_events
             WHERE organization_id = $1 AND occurred_at >= NOW() - INTERVAL '10 minutes'
             ORDER BY occurred_at DESC
             LIMIT 50`,
            [req.organization!.id]
          );

          const recentEvents: SecurityEventInput[] = recentRes.rows.map(r => ({
            id: r.id,
            organizationId: req.organization!.id,
            eventType: r.eventType,
            source: r.source,
            actorIdentifier: r.actorIdentifier,
            sourceIp: r.sourceIp,
            occurredAt: r.occurredAt,
            sanitizedPayload: r.sanitizedPayload,
          }));

          // Insert event
          const insertRes = await client.query(
            `INSERT INTO security_events (
              organization_id, event_type, source, source_event_id, actor_identifier,
              source_ip, occurred_at, sanitized_payload, privacy_scanned, ingestion_source, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
            RETURNING id, occurred_at`,
            [
              req.organization!.id,
              body.eventType,
              body.source,
              body.sourceEventId || null,
              body.actorIdentifier || null,
              body.sourceIp || null,
              body.occurredAt,
              JSON.stringify(sanitizedPayload),
              body.ingestionSource || 'manual',
              req.user!.id,
            ]
          );

          const eventId = insertRes.rows[0].id;

          const eventToEvaluate: SecurityEventInput = {
            id: eventId,
            organizationId: req.organization!.id,
            eventType: body.eventType,
            source: body.source,
            actorIdentifier: body.actorIdentifier,
            sourceIp: body.sourceIp,
            occurredAt: body.occurredAt,
            sanitizedPayload,
            description,
          };

          // 2. Evaluate Deterministic Detection Rules
          const detectedAlerts = DetectionEngineService.evaluateEvent(eventToEvaluate, recentEvents);
          const savedAlerts = [];

          for (const alert of detectedAlerts) {
            const alertRes = await client.query(
              `INSERT INTO security_alerts (
                organization_id, event_id, rule_code, title, description,
                category, severity, risk_score, evidence, recommended_actions, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
              ON CONFLICT (event_id, rule_code) WHERE event_id IS NOT NULL DO NOTHING
              RETURNING id, rule_code, title, severity, risk_score`,
              [
                req.organization!.id,
                eventId,
                alert.ruleCode,
                alert.title,
                alert.description,
                alert.category,
                alert.severity,
                alert.riskScore,
                JSON.stringify(alert.evidence),
                JSON.stringify(alert.recommendedActions),
              ]
            );

            if (alertRes.rows.length > 0) {
              savedAlerts.push(alertRes.rows[0]);
              await AuditChainService.record(client, {
                organizationId: req.organization!.id,
                actorUserId: req.user!.id,
                action: 'alert.created',
                resourceType: 'security_alert',
                resourceId: alertRes.rows[0].id,
                metadata: {
                  ruleCode: alert.ruleCode,
                  severity: alert.severity,
                  riskScore: alert.riskScore,
                },
              });
            }
          }

          // Record audit log for event
          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'event.created',
            resourceType: 'security_event',
            resourceId: eventId,
            metadata: { eventType: body.eventType, source: body.source },
          });

          return {
            eventId,
            alertsCreated: savedAlerts,
          };
        }
      );

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Bulk Ingestion (File upload CSV/JSON or raw JSON body)
eventsRouter.post(
  '/events/import',
  requireAuth,
  requireOrgMember('analyst'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let parseResult;

      if (req.file) {
        const isCsv = req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv');
        if (isCsv) {
          parseResult = ImportParserService.parseCsv(req.file.buffer, req.organization!.id, true);
        } else {
          parseResult = ImportParserService.parseJson(req.file.buffer, req.organization!.id, true);
        }
      } else if (req.body && req.body.events) {
        parseResult = ImportParserService.parseJson(JSON.stringify(req.body.events), req.organization!.id, true);
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILE_OR_BODY',
            message: 'Please provide either a CSV/JSON file upload or an events array in the request body.',
          },
        });
        return;
      }

      if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'IMPORT_PARSE_FAILED',
            message: 'Failed to parse records from import.',
            details: parseResult.errors,
          },
        });
        return;
      }

      const events = parseResult.events;

      const summary = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          let insertedCount = 0;
          let alertsCount = 0;
          const insertedEvents: SecurityEventInput[] = [];

          for (const ev of events) {
            try {
              const res = await client.query(
                `INSERT INTO security_events (
                  organization_id, event_type, source, source_event_id, actor_identifier,
                  source_ip, occurred_at, sanitized_payload, privacy_scanned, ingestion_source, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
                ON CONFLICT (organization_id, source, source_event_id) WHERE source_event_id IS NOT NULL DO NOTHING
                RETURNING id`,
                [
                  req.organization!.id,
                  ev.eventType,
                  ev.source,
                  ev.sourceEventId || null,
                  ev.actorIdentifier || null,
                  ev.sourceIp || null,
                  ev.occurredAt,
                  JSON.stringify(ev.sanitizedPayload),
                  req.file ? (req.file.originalname.endsWith('.csv') ? 'csv' : 'json') : 'api',
                  req.user!.id,
                ]
              );

              if (res.rows.length > 0) {
                insertedCount++;
                const createdEv = { ...ev, id: res.rows[0].id };
                insertedEvents.push(createdEv);

                // Run detection engine
                const alerts = DetectionEngineService.evaluateEvent(createdEv, insertedEvents);
                for (const alert of alerts) {
                  const alertRes = await client.query(
                    `INSERT INTO security_alerts (
                      organization_id, event_id, rule_code, title, description,
                      category, severity, risk_score, evidence, recommended_actions, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
                    ON CONFLICT (event_id, rule_code) WHERE event_id IS NOT NULL DO NOTHING
                    RETURNING id`,
                    [
                      req.organization!.id,
                      createdEv.id,
                      alert.ruleCode,
                      alert.title,
                      alert.description,
                      alert.category,
                      alert.severity,
                      alert.riskScore,
                      JSON.stringify(alert.evidence),
                      JSON.stringify(alert.recommendedActions),
                    ]
                  );
                  if (alertRes.rows.length > 0) {
                    alertsCount++;
                  }
                }
              }
            } catch {
              // Ignore duplicate or individual row conflict
            }
          }

          // Record audit log
          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'events.imported',
            resourceType: 'security_event',
            metadata: {
              totalParsed: parseResult.totalParsed,
              insertedCount,
              alertsCreated: alertsCount,
              sensitiveItemsRedacted: parseResult.totalSensitiveDetected,
            },
          });

          return {
            totalParsed: parseResult.totalParsed,
            totalInserted: insertedCount,
            totalAlertsCreated: alertsCount,
            sensitiveItemsRedacted: parseResult.totalSensitiveDetected,
            warnings: parseResult.errors,
          };
        }
      );

      res.status(201).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
);

