import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { AuditChainService } from '../../services/audit-chain.service.js';

export const auditRouter = Router();

// List audit logs
auditRouter.get(
  '/audit',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { page = 1, limit = 50, action, search } = req.query as Record<string, string>;
    const offset = (Number(page) - 1) * Number(limit);

    try {
      const data = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const conditions: string[] = ['a.organization_id = $1'];
          const params: unknown[] = [req.organization!.id];
          let paramIdx = 2;

          if (action) {
            conditions.push(`a.action = $${paramIdx}`);
            params.push(action);
            paramIdx++;
          }

          if (search) {
            conditions.push(`(a.action ILIKE $${paramIdx} OR a.resource_type ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
          }

          const whereClause = conditions.join(' AND ');

          const countRes = await client.query(
            `SELECT COUNT(*) as total FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id WHERE ${whereClause}`,
            params
          );
          const total = parseInt(countRes.rows[0].total, 10);

          const listRes = await client.query(
            `SELECT a.id, a.action, a.resource_type as "resourceType", a.resource_id as "resourceId",
                    a.metadata, a.previous_hash as "previousHash", a.entry_hash as "entryHash",
                    a.created_at as "createdAt", u.full_name as "actorName", u.email as "actorEmail"
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.actor_user_id
             WHERE ${whereClause}
             ORDER BY a.created_at DESC
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

// Verify SHA-256 Hash Chain Integrity
auditRouter.get(
  '/audit/verify',
  requireAuth,
  requireOrgMember('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const verification = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          return AuditChainService.verifyIntegrity(client, req.organization!.id);
        }
      );

      res.json({
        success: true,
        data: verification,
      });
    } catch (err) {
      next(err);
    }
  }
);

