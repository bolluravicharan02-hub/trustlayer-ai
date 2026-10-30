import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import {
  OrganizationSchema,
  RoleEnum,
  InvitationSchema,
  AcceptInvitationSchema,
  Role
} from '../../schemas/index.js';

export const organizationsRouter = Router();

// List user memberships
organizationsRouter.get('/organizations', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) return;
  try {
    const orgsRes = await withTenantTransaction(
      { organizationId: req.session.activeOrgId || '00000000-0000-0000-0000-000000000000', userId: req.user.id, role: 'viewer' },
      async (client) => {
        return client.query(
          `SELECT o.id, o.name, o.slug, o.settings, m.role, m.joined_at, o.created_at
           FROM organization_memberships m
           JOIN organizations o ON o.id = m.organization_id
           WHERE m.user_id = $1 AND m.status = 'active'
           ORDER BY m.joined_at ASC`,
          [req.user!.id]
        );
      }
    );

    res.json({
      success: true,
      data: orgsRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Create new organization
organizationsRouter.post(
  '/organizations',
  requireAuth,
  validateBody(OrganizationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return;
    const { name, slug: customSlug, settings } = req.body;

    try {
      const baseSlug = (customSlug || name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      let newOrg: { id: string; name: string; slug: string };

      // We run inside transaction
      await withTenantTransaction(
        { organizationId: '00000000-0000-0000-0000-000000000000', userId: req.user.id, role: 'owner' },
        async (client) => {
          const orgRes = await client.query(
            `INSERT INTO organizations (name, slug, settings)
             VALUES ($1, $2, $3)
             RETURNING id, name, slug`,
            [name, slug, JSON.stringify(settings || {})]
          );
          newOrg = orgRes.rows[0];

          await client.query(
            `INSERT INTO organization_memberships (organization_id, user_id, role, status)
             VALUES ($1, $2, 'owner', 'active')`,
            [newOrg.id, req.user!.id]
          );

          await AuditChainService.record(client, {
            organizationId: newOrg.id,
            actorUserId: req.user!.id,
            action: 'organization.created',
            resourceType: 'organization',
            resourceId: newOrg.id,
            metadata: { organizationName: newOrg.name },
          });
        }
      );

      req.session.activeOrgId = newOrg!.id;

      res.status(201).json({
        success: true,
        data: newOrg!,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get organization details
organizationsRouter.get(
  '/organizations/:id',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const org = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            'SELECT id, name, slug, settings, created_at, updated_at FROM organizations WHERE id = $1',
            [req.organization!.id]
          );
          return res.rows[0];
        }
      );

      if (!org) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Organization not found' } });
        return;
      }

      res.json({
        success: true,
        data: {
          ...org,
          userRole: req.organization!.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update organization (requires admin or owner)
organizationsRouter.patch(
  '/organizations/:id',
  requireAuth,
  requireOrgMember('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, settings } = req.body;
    try {
      const updated = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `UPDATE organizations
             SET name = COALESCE($1, name),
                 settings = COALESCE($2, settings),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, name, slug, settings, updated_at`,
            [name || null, settings ? JSON.stringify(settings) : null, req.organization!.id]
          );

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'organization.updated',
            resourceType: 'organization',
            resourceId: req.organization!.id,
            metadata: { name, settings },
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

// List organization members
organizationsRouter.get(
  '/organizations/:id/members',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT m.id, m.user_id as "userId", u.full_name as "fullName", u.email,
                    m.role, m.status, m.joined_at as "joinedAt"
             FROM organization_memberships m
             JOIN users u ON u.id = m.user_id
             WHERE m.organization_id = $1
             ORDER BY m.joined_at ASC`,
            [req.organization!.id]
          );
          return res.rows;
        }
      );

      res.json({
        success: true,
        data: members,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Create invitation (Admin/Owner only)
organizationsRouter.post(
  '/organizations/:id/invitations',
  requireAuth,
  requireOrgMember('admin'),
  validateBody(InvitationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, role } = req.body;

    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          await client.query(
            `INSERT INTO organization_invitations (organization_id, email, role, token_hash, invited_by, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.organization!.id, email.toLowerCase(), role, tokenHash, req.user!.id, expiresAt]
          );

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'member.invited',
            resourceType: 'invitation',
            metadata: { email, role, expiresAt },
          });
        }
      );

      res.status(201).json({
        success: true,
        data: {
          email,
          role,
          invitationToken: rawToken,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Accept invitation
organizationsRouter.post(
  '/organizations/:id/invitations/accept',
  requireAuth,
  validateBody(AcceptInvitationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
      await withTenantTransaction(
        { organizationId: req.params.id, userId: req.user!.id, role: 'viewer' },
        async (client) => {
          const invRes = await client.query(
            `SELECT id, organization_id, email, role, expires_at, accepted_at
             FROM organization_invitations
             WHERE token_hash = $1 AND organization_id = $2`,
            [tokenHash, req.params.id]
          );

          if (invRes.rows.length === 0) {
            throw new Error('Invalid or expired invitation token.');
          }

          const inv = invRes.rows[0];
          if (inv.accepted_at) {
            throw new Error('This invitation has already been accepted.');
          }

          if (new Date(inv.expires_at) < new Date()) {
            throw new Error('This invitation has expired.');
          }

          // Add user to membership
          await client.query(
            `INSERT INTO organization_memberships (organization_id, user_id, role, status)
             VALUES ($1, $2, $3, 'active')
             ON CONFLICT (organization_id, user_id)
             DO UPDATE SET role = EXCLUDED.role, status = 'active'`,
            [inv.organization_id, req.user!.id, inv.role]
          );

          // Mark accepted
          await client.query(
            'UPDATE organization_invitations SET accepted_at = NOW() WHERE id = $1',
            [inv.id]
          );

          await AuditChainService.record(client, {
            organizationId: inv.organization_id,
            actorUserId: req.user!.id,
            action: 'invitation.accepted',
            resourceType: 'membership',
            metadata: { userEmail: req.user!.email, role: inv.role },
          });
        }
      );

      res.json({
        success: true,
        message: 'Invitation accepted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update member role (Owner/Admin only)
organizationsRouter.patch(
  '/organizations/:id/members/:userId',
  requireAuth,
  requireOrgMember('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { role } = req.body;
    const targetUserId = req.params.userId;

    if (!RoleEnum.safeParse(role).success) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role provided' } });
      return;
    }

    try {
      await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          // If changing owner, ensure user is owner
          if (role === 'owner' && req.organization!.role !== 'owner') {
            throw new Error('Only organization owners can promote members to owner.');
          }

          // Check if demoting an owner, ensure there is at least one other owner
          const currentTargetRoleRes = await client.query(
            'SELECT role FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
            [req.organization!.id, targetUserId]
          );

          if (currentTargetRoleRes.rows.length === 0) {
            throw new Error('Member not found');
          }

          if (currentTargetRoleRes.rows[0].role === 'owner' && role !== 'owner') {
            const ownerCountRes = await client.query(
              "SELECT count(*) as count FROM organization_memberships WHERE organization_id = $1 AND role = 'owner' AND status = 'active'",
              [req.organization!.id]
            );
            if (parseInt(ownerCountRes.rows[0].count, 10) <= 1) {
              throw new Error('Cannot demote the only organization owner. Assign another owner first.');
            }
          }

          await client.query(
            `UPDATE organization_memberships
             SET role = $1
             WHERE organization_id = $2 AND user_id = $3`,
            [role, req.organization!.id, targetUserId]
          );

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'member.role_updated',
            resourceType: 'membership',
            resourceId: targetUserId,
            metadata: { newRole: role },
          });
        }
      );

      res.json({
        success: true,
        message: 'Member role updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Remove member (Owner/Admin only)
organizationsRouter.delete(
  '/organizations/:id/members/:userId',
  requireAuth,
  requireOrgMember('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const targetUserId = req.params.userId;

    try {
      await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const targetRes = await client.query(
            'SELECT role FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
            [req.organization!.id, targetUserId]
          );

          if (targetRes.rows.length === 0) {
            throw new Error('Member not found');
          }

          if (targetRes.rows[0].role === 'owner') {
            const ownerCountRes = await client.query(
              "SELECT count(*) as count FROM organization_memberships WHERE organization_id = $1 AND role = 'owner' AND status = 'active'",
              [req.organization!.id]
            );
            if (parseInt(ownerCountRes.rows[0].count, 10) <= 1) {
              throw new Error('Cannot remove the only owner of the organization.');
            }
          }

          await client.query(
            'DELETE FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
            [req.organization!.id, targetUserId]
          );

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'member.removed',
            resourceType: 'membership',
            resourceId: targetUserId,
          });
        }
      );

      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

