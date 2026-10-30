import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';

export const dashboardRouter = Router();

// KPI Summary
dashboardRouter.get(
  '/dashboard/summary',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const eventsRes = await client.query(
            'SELECT COUNT(*) as count FROM security_events WHERE organization_id = $1',
            [req.organization!.id]
          );

          const openAlertsRes = await client.query(
            "SELECT COUNT(*) as count FROM security_alerts WHERE organization_id = $1 AND status IN ('open', 'acknowledged', 'investigating')",
            [req.organization!.id]
          );

          const criticalAlertsRes = await client.query(
            "SELECT COUNT(*) as count FROM security_alerts WHERE organization_id = $1 AND severity = 'critical' AND status != 'resolved'",
            [req.organization!.id]
          );

          const findingsRes = await client.query(
            'SELECT COUNT(*) as count FROM privacy_findings WHERE organization_id = $1',
            [req.organization!.id]
          );

          const redactedRes = await client.query(
            "SELECT COUNT(*) as count FROM privacy_findings WHERE organization_id = $1 AND status = 'redacted'",
            [req.organization!.id]
          );

          const resolvedRes = await client.query(
            "SELECT COUNT(*) as count FROM security_alerts WHERE organization_id = $1 AND status = 'resolved'",
            [req.organization!.id]
          );

          return {
            totalEvents: parseInt(eventsRes.rows[0].count, 10),
            openAlerts: parseInt(openAlertsRes.rows[0].count, 10),
            criticalAlerts: parseInt(criticalAlertsRes.rows[0].count, 10),
            privacyFindings: parseInt(findingsRes.rows[0].count, 10),
            redactedItems: parseInt(redactedRes.rows[0].count, 10),
            resolvedIncidents: parseInt(resolvedRes.rows[0].count, 10),
          };
        }
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Events Timeline (last 7 days by day)
dashboardRouter.get(
  '/dashboard/events-timeline',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timeline = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT to_char(occurred_at, 'YYYY-MM-DD') as date,
                    COUNT(*) as count
             FROM security_events
             WHERE organization_id = $1 AND occurred_at >= NOW() - INTERVAL '14 days'
             GROUP BY to_char(occurred_at, 'YYYY-MM-DD')
             ORDER BY date ASC`,
            [req.organization!.id]
          );
          return res.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) }));
        }
      );

      res.json({
        success: true,
        data: timeline,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Alerts Distribution by Severity
dashboardRouter.get(
  '/dashboard/alerts-distribution',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const distribution = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT severity, COUNT(*) as count
             FROM security_alerts
             WHERE organization_id = $1
             GROUP BY severity`,
            [req.organization!.id]
          );
          return res.rows.map(r => ({ severity: r.severity, count: parseInt(r.count, 10) }));
        }
      );

      res.json({
        success: true,
        data: distribution,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Privacy Findings Distribution by Category
dashboardRouter.get(
  '/dashboard/privacy-distribution',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const distribution = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT category, COUNT(*) as count
             FROM privacy_findings
             WHERE organization_id = $1
             GROUP BY category
             ORDER BY count DESC
             LIMIT 8`,
            [req.organization!.id]
          );
          return res.rows.map(r => ({ category: r.category, count: parseInt(r.count, 10) }));
        }
      );

      res.json({
        success: true,
        data: distribution,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Recent Activity Stream
dashboardRouter.get(
  '/dashboard/recent-activity',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activities = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT a.id, a.action, a.resource_type as "resourceType", a.resource_id as "resourceId",
                    a.metadata, a.created_at as "createdAt",
                    u.full_name as "actorName", u.email as "actorEmail"
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.actor_user_id
             WHERE a.organization_id = $1
             ORDER BY a.created_at DESC
             LIMIT 15`,
            [req.organization!.id]
          );
          return res.rows;
        }
      );

      res.json({
        success: true,
        data: activities,
      });
    } catch (err) {
      next(err);
    }
  }
);

