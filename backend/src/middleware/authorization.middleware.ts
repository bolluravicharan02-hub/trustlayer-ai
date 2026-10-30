import { Request, Response, NextFunction } from 'express';
import { appPool } from '../config/database.js';
import { Role } from '../schemas/index.js';

const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  analyst: 2,
  viewer: 1,
};

export function requireOrgMember(minRole: Role = 'viewer') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Extract target org ID from header, query, body, or active session
    const headerOrgId = req.headers['x-organization-id'];
    const orgId = (typeof headerOrgId === 'string' ? headerOrgId : null) ||
      (req.query.orgId as string) ||
      (req.body?.organizationId as string) ||
      req.session?.activeOrgId;

    if (!orgId) {
      // If no org specified, find the user's first active organization
      try {
        const defaultOrgRes = await appPool.query(
          `SELECT o.id, o.name, o.slug, m.role
           FROM organization_memberships m
           JOIN organizations o ON o.id = m.organization_id
           WHERE m.user_id = $1 AND m.status = 'active'
           ORDER BY m.joined_at ASC
           LIMIT 1`,
          [req.user.id]
        );

        if (defaultOrgRes.rows.length === 0) {
          res.status(403).json({
            success: false,
            error: {
              code: 'NO_ACTIVE_ORGANIZATION',
              message: 'User does not belong to any active organization.',
            },
          });
          return;
        }

        const row = defaultOrgRes.rows[0];
        req.organization = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          role: row.role as Role,
        };
        if (req.session) {
          req.session.activeOrgId = row.id;
        }

        // Check role permission
        if (ROLE_RANK[row.role as Role] < ROLE_RANK[minRole]) {
          res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: `This operation requires '${minRole}' role or higher. Your role is '${row.role}'.`,
            },
          });
          return;
        }

        next();
        return;
      } catch (err) {
        next(err);
        return;
      }
    }

    try {
      const memberRes = await appPool.query(
        `SELECT o.id, o.name, o.slug, m.role
         FROM organization_memberships m
         JOIN organizations o ON o.id = m.organization_id
         WHERE m.user_id = $1 AND m.organization_id = $2 AND m.status = 'active'`,
        [req.user.id, orgId]
      );

      if (memberRes.rows.length === 0) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not an authorized member of the requested organization.',
          },
        });
        return;
      }

      const row = memberRes.rows[0];
      req.organization = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        role: row.role as Role,
      };

      if (req.session) {
        req.session.activeOrgId = row.id;
      }

      if (ROLE_RANK[row.role as Role] < ROLE_RANK[minRole]) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `This operation requires '${minRole}' role or higher. Your current role is '${row.role}'.`,
          },
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

