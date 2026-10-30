import { Router, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { appPool } from '../../config/database.js';
import { env } from '../../config/env.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limit.middleware.js';
import { getOrCreateCsrfToken } from '../../middleware/csrf.middleware.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import { syncClerkUser } from '../../services/clerk-sync.service.js';
import { RegistrationSchema, LoginSchema, Role } from '../../schemas/index.js';

export const authRouter = Router();

// CSRF Token Provider
authRouter.get('/auth/csrf', (req: Request, res: Response) => {
  const token = getOrCreateCsrfToken(req);
  res.json({
    success: true,
    data: { csrfToken: token },
  });
});

// Registration
authRouter.post(
  '/auth/register',
  rateLimit(env.LOGIN_RATE_LIMIT, 60000, 'register'),
  validateBody(RegistrationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { fullName, email, password, organizationName } = req.body;
    const client = await appPool.connect();

    try {
      await client.query('BEGIN');

      // Check for existing email
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email address already exists.',
          },
        });
        return;
      }

      // Hash password using Argon2id
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      // Insert User
      const userRes = await client.query(
        `INSERT INTO users (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, full_name, email, created_at`,
        [fullName, email.toLowerCase(), passwordHash]
      );
      const newUser = userRes.rows[0];

      // Generate organization slug
      const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      // Insert Organization
      const orgRes = await client.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         RETURNING id, name, slug`,
        [organizationName, slug]
      );
      const newOrg = orgRes.rows[0];

      // Add user as Owner
      await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')`,
        [newOrg.id, newUser.id]
      );

      // Record Genesis Audit Log
      await AuditChainService.record(client, {
        organizationId: newOrg.id,
        actorUserId: newUser.id,
        action: 'organization.created',
        resourceType: 'organization',
        resourceId: newOrg.id,
        metadata: { organizationName: newOrg.name, ownerEmail: newUser.email },
      });

      await client.query('COMMIT');

      // Regenerate session
      req.session.regenerate((err) => {
        if (err) return next(err);

        req.session.userId = newUser.id;
        req.session.activeOrgId = newOrg.id;
        const csrfToken = getOrCreateCsrfToken(req);

        res.status(201).json({
          success: true,
          data: {
            user: {
              id: newUser.id,
              fullName: newUser.full_name,
              email: newUser.email,
            },
            organization: {
              id: newOrg.id,
              name: newOrg.name,
              slug: newOrg.slug,
              role: 'owner',
            },
            csrfToken,
          },
        });
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// Login
authRouter.post(
  '/auth/login',
  rateLimit(env.LOGIN_RATE_LIMIT, 60000, 'login'),
  validateBody(LoginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    try {
      const userRes = await appPool.query(
        `SELECT id, full_name, email, password_hash, is_active
         FROM users
         WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (userRes.rows.length === 0) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        });
        return;
      }

      const user = userRes.rows[0];

      if (!user.is_active) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'This account has been deactivated. Please contact your organization administrator.',
          },
        });
        return;
      }

      // Verify Argon2id password hash
      const isValid = await argon2.verify(user.password_hash, password);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        });
        return;
      }

      // Fetch user organizations
      const orgsRes = await appPool.query(
        `SELECT o.id, o.name, o.slug, m.role
         FROM organization_memberships m
         JOIN organizations o ON o.id = m.organization_id
         WHERE m.user_id = $1 AND m.status = 'active'
         ORDER BY m.joined_at ASC`,
        [user.id]
      );

      const organizations = orgsRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        role: r.role as Role,
      }));

      const activeOrg = organizations[0] || null;

      // Update last login
      await appPool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      // Establish session
      req.session.regenerate(async (err) => {
        if (err) return next(err);

        req.session.userId = user.id;
        if (activeOrg) {
          req.session.activeOrgId = activeOrg.id;
        }

        const csrfToken = getOrCreateCsrfToken(req);

        // Record audit if active org exists
        if (activeOrg) {
          try {
            const auditClient = await appPool.connect();
            try {
              await auditClient.query('BEGIN');
              await AuditChainService.record(auditClient, {
                organizationId: activeOrg.id,
                actorUserId: user.id,
                action: 'user.login',
                resourceType: 'user',
                resourceId: user.id,
                metadata: { ip: req.ip || 'unknown' },
              });
              await auditClient.query('COMMIT');
            } finally {
              auditClient.release();
            }
          } catch {
            // Non-critical audit logging failure during login
          }
        }

        res.json({
          success: true,
          data: {
            user: {
              id: user.id,
              fullName: user.full_name,
              email: user.email,
            },
            organization: activeOrg,
            organizations,
            csrfToken,
          },
        });
      });
    } catch (err) {
      next(err);
    }
  }
);

// Logout
authRouter.post('/auth/logout', (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(env.SESSION_NAME);
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
});

// Current User & Session Status
authRouter.get('/auth/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  try {
    const orgsRes = await appPool.query(
      `SELECT o.id, o.name, o.slug, m.role
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY m.joined_at ASC`,
      [req.user.id]
    );

    const organizations = orgsRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      role: r.role as Role,
    }));

    const activeOrgId = (req.headers['x-organization-id'] as string) || req.session?.activeOrgId;
    const currentOrg = organizations.find(o => o.id === activeOrgId) || organizations[0] || null;

    res.json({
      success: true,
      data: {
        user: req.user,
        organization: currentOrg,
        organizations,
        csrfToken: getOrCreateCsrfToken(req),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Clerk Synchronization endpoint: ensures user and organization are provisioned and returns session details
authRouter.post('/auth/clerk-sync', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  try {
    const orgsRes = await appPool.query(
      `SELECT o.id, o.name, o.slug, m.role
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY m.joined_at ASC`,
      [req.user.id]
    );

    const organizations = orgsRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      role: r.role as Role,
    }));

    const activeOrgId = (req.headers['x-organization-id'] as string) || req.session?.activeOrgId;
    const currentOrg = organizations.find(o => o.id === activeOrgId) || organizations[0] || null;

    res.json({
      success: true,
      data: {
        user: req.user,
        organization: currentOrg,
        organizations,
        csrfToken: getOrCreateCsrfToken(req),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Clerk Webhooks for asynchronous user synchronization
authRouter.post('/auth/clerk-webhook', async (req: Request, res: Response): Promise<void> => {
  const { type, data } = req.body || {};
  if (!type || !data) {
    res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    return;
  }

  try {
    if (type === 'user.created' || type === 'user.updated') {
      const clerkUserId = data.id;
      const primaryEmail = data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id) || data.email_addresses?.[0];
      const email = primaryEmail?.email_address;
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'User';

      if (clerkUserId) {
        await syncClerkUser(clerkUserId, email, fullName);
      }
    } else if (type === 'user.deleted') {
      const clerkUserId = data.id;
      if (clerkUserId) {
        await appPool.query('UPDATE users SET is_active = false WHERE clerk_user_id = $1', [clerkUserId]);
      }
    }

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

