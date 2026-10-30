import { createClerkClient } from '@clerk/backend';
import { appPool } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AuditChainService } from './audit-chain.service.js';

let clerkClientInstance: ReturnType<typeof createClerkClient> | null = null;

export function getClerkClient() {
  if (!clerkClientInstance && env.CLERK_SECRET_KEY) {
    clerkClientInstance = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });
  }
  return clerkClientInstance;
}

export interface SyncedUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  clerkUserId?: string;
}

/**
 * Finds or provisions a user matching the Clerk user identity.
 * Creates an organization and membership if this is a first-time user.
 */
export async function syncClerkUser(
  clerkUserId: string,
  fallbackEmail?: string,
  fallbackName?: string
): Promise<SyncedUser | null> {
  // 1. Direct match on Clerk User ID
  const directMatch = await appPool.query(
    'SELECT id, email, full_name, is_active, clerk_user_id FROM users WHERE clerk_user_id = $1',
    [clerkUserId]
  );

  if (directMatch.rows.length > 0) {
    const row = directMatch.rows[0];
    await appPool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      clerkUserId: row.clerk_user_id,
    };
  }

  // 2. Query profile from Clerk API if available
  let email = fallbackEmail || '';
  let fullName = fallbackName || 'Security Analyst';

  const clerk = getClerkClient();
  if (clerk) {
    try {
      const cu = await clerk.users.getUser(clerkUserId);
      const primaryEmail = cu.emailAddresses?.find((e) => e.id === cu.primaryEmailAddressId) || cu.emailAddresses?.[0];
      if (primaryEmail?.emailAddress) {
        email = primaryEmail.emailAddress;
      }
      const parts = [cu.firstName, cu.lastName].filter(Boolean);
      if (parts.length > 0) {
        fullName = parts.join(' ');
      } else if (cu.username) {
        fullName = cu.username;
      }
    } catch (err) {
      logger.warn({ err, clerkUserId }, 'Could not retrieve user details from Clerk API');
    }
  }

  if (!email) {
    email = `${clerkUserId}@clerk.user`;
  }

  email = email.toLowerCase().trim();

  // 3. Check for existing user with the same email (account linking)
  const emailMatch = await appPool.query(
    'SELECT id, email, full_name, is_active FROM users WHERE email = $1',
    [email]
  );

  if (emailMatch.rows.length > 0) {
    const existing = emailMatch.rows[0];
    await appPool.query(
      'UPDATE users SET clerk_user_id = $1, last_login_at = NOW(), updated_at = NOW() WHERE id = $2',
      [clerkUserId, existing.id]
    );
    return {
      id: existing.id,
      email: existing.email,
      fullName: existing.full_name,
      isActive: existing.is_active,
      clerkUserId,
    };
  }

  // 4. JIT Provision new user and their primary organization
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');

    const insertUserRes = await client.query(
      `INSERT INTO users (full_name, email, clerk_user_id, is_active, last_login_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING id, full_name, email, is_active`,
      [fullName, email, clerkUserId]
    );
    const newUser = insertUserRes.rows[0];

    // Create organization
    const orgName = `${fullName}'s Organization`;
    const baseSlug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'workspace';
    const slug = `${baseSlug.slice(0, 30)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const orgRes = await client.query(
      `INSERT INTO organizations (name, slug, settings)
       VALUES ($1, $2, '{}'::jsonb)
       RETURNING id, name, slug`,
      [orgName, slug]
    );
    const newOrg = orgRes.rows[0];

    // Add user as Owner
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [newOrg.id, newUser.id]
    );

    // Initial audit log
    await AuditChainService.record(client, {
      organizationId: newOrg.id,
      actorUserId: newUser.id,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: newOrg.id,
      metadata: { source: 'clerk_jit_provisioning', organizationName: newOrg.name },
    });

    await client.query('COMMIT');

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      isActive: newUser.is_active,
      clerkUserId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, clerkUserId, email }, 'Error during Clerk JIT provisioning');
    throw err;
  } finally {
    client.release();
  }
}
