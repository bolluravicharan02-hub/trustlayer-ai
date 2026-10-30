import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { AuditChainService } from '../../services/audit-chain.service.js';

export const reportsRouter = Router();

// Overview Report
reportsRouter.get(
  '/reports/overview',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const eventsTotal = await client.query('SELECT COUNT(*) FROM security_events WHERE organization_id = $1', [req.organization!.id]);
          const alertsTotal = await client.query('SELECT COUNT(*) FROM security_alerts WHERE organization_id = $1', [req.organization!.id]);
          const privacyFindings = await client.query('SELECT COUNT(*) FROM privacy_findings WHERE organization_id = $1', [req.organization!.id]);
          const aiRunsTotal = await client.query('SELECT COUNT(*) FROM ai_analysis_runs WHERE organization_id = $1', [req.organization!.id]);

          const severityBreakdown = await client.query(
            `SELECT severity, COUNT(*) as count FROM security_alerts WHERE organization_id = $1 GROUP BY severity`,
            [req.organization!.id]
          );

          const statusBreakdown = await client.query(
            `SELECT status, COUNT(*) as count FROM security_alerts WHERE organization_id = $1 GROUP BY status`,
            [req.organization!.id]
          );

          return {
            organization: {
              id: req.organization!.id,
              name: req.organization!.name,
            },
            generatedAt: new Date().toISOString(),
            metrics: {
              totalEvents: parseInt(eventsTotal.rows[0].count, 10),
              totalAlerts: parseInt(alertsTotal.rows[0].count, 10),
              totalPrivacyFindings: parseInt(privacyFindings.rows[0].count, 10),
              totalAiRuns: parseInt(aiRunsTotal.rows[0].count, 10),
            },
            alertsBySeverity: severityBreakdown.rows,
            alertsByStatus: statusBreakdown.rows,
          };
        }
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Alerts Report
reportsRouter.get(
  '/reports/alerts',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT a.id, a.rule_code as "ruleCode", a.title, a.category,
                    a.severity, a.risk_score as "riskScore", a.status,
                    a.created_at as "createdAt", a.resolved_at as "resolvedAt",
                    u.full_name as "assignedTo"
             FROM security_alerts a
             LEFT JOIN users u ON u.id = a.assigned_to
             WHERE a.organization_id = $1
             ORDER BY a.created_at DESC`,
            [req.organization!.id]
          );
          return res.rows;
        }
      );

      res.json({
        success: true,
        data: {
          organization: req.organization!.name,
          generatedAt: new Date().toISOString(),
          alerts: data,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Privacy Findings Report
reportsRouter.get(
  '/reports/privacy',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT id, category, safe_preview as "safePreview", confidence,
                    detection_method as "detectionMethod", status, created_at as "createdAt"
             FROM privacy_findings
             WHERE organization_id = $1
             ORDER BY created_at DESC`,
            [req.organization!.id]
          );
          return res.rows;
        }
      );

      res.json({
        success: true,
        data: {
          organization: req.organization!.name,
          generatedAt: new Date().toISOString(),
          findings: data,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Data Export (JSON or CSV)
reportsRouter.get(
  '/reports/export',
  requireAuth,
  requireOrgMember('analyst'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { type = 'alerts', format = 'json' } = req.query as Record<string, string>;

    try {
      const exported = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          let rows: Record<string, unknown>[] = [];

          if (type === 'alerts') {
            const res = await client.query(
              `SELECT a.id, a.rule_code as "ruleCode", a.title, a.category,
                      a.severity, a.risk_score as "riskScore", a.status,
                      a.created_at as "createdAt"
               FROM security_alerts a
               WHERE a.organization_id = $1
               ORDER BY a.created_at DESC`,
              [req.organization!.id]
            );
            rows = res.rows;
          } else if (type === 'events') {
            const res = await client.query(
              `SELECT id, event_type as "eventType", source, actor_identifier as "actorIdentifier",
                      source_ip as "sourceIp", occurred_at as "occurredAt"
               FROM security_events
               WHERE organization_id = $1
               ORDER BY occurred_at DESC
               LIMIT 1000`,
              [req.organization!.id]
            );
            rows = res.rows;
          } else if (type === 'privacy') {
            const res = await client.query(
              `SELECT id, category, safe_preview as "safePreview", status, created_at as "createdAt"
               FROM privacy_findings
               WHERE organization_id = $1
               ORDER BY created_at DESC`,
              [req.organization!.id]
            );
            rows = res.rows;
          }

          // Record audit log
          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'data.exported',
            resourceType: 'export',
            metadata: { type, format, recordCount: rows.length },
          });

          return rows;
        }
      );

      if (format === 'csv') {
        if (exported.length === 0) {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="trustlayer-${type}.csv"`);
          res.send('No data available');
          return;
        }

        const headers = Object.keys(exported[0]);
        const csvLines = [headers.join(',')];

        for (const row of exported) {
          const values = headers.map(h => {
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
            return `"${str}"`;
          });
          csvLines.push(values.join(','));
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="trustlayer-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csvLines.join('\n'));
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="trustlayer-${type}-${new Date().toISOString().slice(0, 10)}.json"`);
      res.json({
        organization: req.organization!.name,
        exportedAt: new Date().toISOString(),
        type,
        recordCount: exported.length,
        records: exported,
      });
    } catch (err) {
      next(err);
    }
  }
);

