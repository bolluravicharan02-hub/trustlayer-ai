import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import { SecurityPolicySchema, UpdateSecurityPolicySchema } from '../../schemas/index.js';

export const policiesRouter = Router();

// List policies
policiesRouter.get(
  '/policies',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const policies = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT p.id, p.name, p.description, p.category, p.policy_type as "policyType",
                    p.configuration, p.is_enabled as "isEnabled", p.created_at as "createdAt",
                    p.updated_at as "updatedAt", u.full_name as "createdByName"
             FROM security_policies p
             LEFT JOIN users u ON u.id = p.created_by
             WHERE p.organization_id = $1
             ORDER BY p.name ASC`,
            [req.organization!.id]
          );
          return res.rows;
        }
      );

      res.json({
        success: true,
        data: policies,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Create policy (Admin/Owner only)
policiesRouter.post(
  '/policies',
  requireAuth,
  requireOrgMember('admin'),
  validateBody(SecurityPolicySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, description, category, policyType, configuration, isEnabled = true } = req.body;

    try {
      const created = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `INSERT INTO security_policies (
              organization_id, name, description, category, policy_type,
              configuration, is_enabled, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, category, policy_type as "policyType", is_enabled as "isEnabled", created_at as "createdAt"`,
            [
              req.organization!.id,
              name,
              description || null,
              category,
              policyType,
              JSON.stringify(configuration),
              isEnabled,
              req.user!.id,
            ]
          );

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'policy.created',
            resourceType: 'security_policy',
            resourceId: res.rows[0].id,
            metadata: { name, category, policyType },
          });

          return res.rows[0];
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

// Get single policy
policiesRouter.get(
  '/policies/:id',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const policy = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT p.id, p.name, p.description, p.category, p.policy_type as "policyType",
                    p.configuration, p.is_enabled as "isEnabled", p.created_at as "createdAt",
                    p.updated_at as "updatedAt", u.full_name as "createdByName"
             FROM security_policies p
             LEFT JOIN users u ON u.id = p.created_by
             WHERE p.id = $1 AND p.organization_id = $2`,
            [req.params.id, req.organization!.id]
          );
          return res.rows[0] || null;
        }
      );

      if (!policy) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } });
        return;
      }

      res.json({
        success: true,
        data: policy,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update policy (Admin/Owner only)
policiesRouter.patch(
  '/policies/:id',
  requireAuth,
  requireOrgMember('admin'),
  validateBody(UpdateSecurityPolicySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, description, category, policyType, configuration, isEnabled } = req.body;

    try {
      const updated = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `UPDATE security_policies
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 category = COALESCE($3, category),
                 policy_type = COALESCE($4, policy_type),
                 configuration = COALESCE($5, configuration),
                 is_enabled = COALESCE($6, is_enabled),
                 updated_at = NOW()
             WHERE id = $7 AND organization_id = $8
             RETURNING id, name, category, policy_type as "policyType", configuration, is_enabled as "isEnabled", updated_at as "updatedAt"`,
            [
              name || null,
              description || null,
              category || null,
              policyType || null,
              configuration ? JSON.stringify(configuration) : null,
              typeof isEnabled === 'boolean' ? isEnabled : null,
              req.params.id,
              req.organization!.id,
            ]
          );

          if (res.rows.length === 0) {
            throw new Error('Policy not found');
          }

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'policy.updated',
            resourceType: 'security_policy',
            resourceId: req.params.id,
            metadata: { name, category, isEnabled },
          });

          return res.rows[0];
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

// Delete policy (Admin/Owner only)
policiesRouter.delete(
  '/policies/:id',
  requireAuth,
  requireOrgMember('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const deleteRes = await client.query(
            'DELETE FROM security_policies WHERE id = $1 AND organization_id = $2 RETURNING id, name',
            [req.params.id, req.organization!.id]
          );

          if (deleteRes.rows.length === 0) {
            throw new Error('Policy not found');
          }

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'policy.deleted',
            resourceType: 'security_policy',
            resourceId: req.params.id,
            metadata: { deletedName: deleteRes.rows[0].name },
          });
        }
      );

      res.json({
        success: true,
        message: 'Policy deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

