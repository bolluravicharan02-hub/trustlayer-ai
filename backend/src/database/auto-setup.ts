import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import argon2 from 'argon2';
import { adminPool } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensures database schema migrations and deterministic demo seed data
 * are initialized incrementally on every server boot.
 */
export async function ensureDatabaseReady(): Promise<boolean> {
  // Skip in test environment to avoid interfering with mocks / pg-mem
  if (env.NODE_ENV === 'test') {
    return true;
  }

  let client;
  try {
    client = await adminPool.connect();
  } catch (err: any) {
    logger.warn({ err: err.message }, '⚠️ Database connection could not be established during startup check. Verify DATABASE_URL.');
    return false;
  }

  try {
    // -------------------------------------------------------------
    // 1. INCREMENTAL MIGRATION RUNNER
    // -------------------------------------------------------------
    const possiblePaths = [
      path.resolve(process.cwd(), 'database/migrations'),
      path.resolve(process.cwd(), '../database/migrations'),
      path.resolve(__dirname, '../../../database/migrations'),
      path.resolve(__dirname, '../../database/migrations'),
      path.resolve(__dirname, '../database/migrations'),
    ];

    let migrationsDir = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        migrationsDir = p;
        break;
      }
    }

    if (migrationsDir) {
      // Ensure migrations tracker table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS _schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const applied = await client.query(
          'SELECT 1 FROM _schema_migrations WHERE name = $1',
          [file]
        );

        if (applied.rows.length === 0) {
          logger.info(`⏳ Applying migration: ${file}...`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query(
              'INSERT INTO _schema_migrations (name) VALUES ($1)',
              [file]
            );
            await client.query('COMMIT');
            logger.info(`✅ Successfully applied migration: ${file}`);
          } catch (migErr: any) {
            await client.query('ROLLBACK');
            logger.error({ migErr: migErr.message, file }, `❌ Failed applying migration: ${file}`);
            throw migErr;
          }
        }
      }
    } else {
      logger.warn('⚠️ Migrations directory not located, skipping automated SQL migrations.');
    }

    // -------------------------------------------------------------
    // 2. DETERMINISTIC DEMO SEED
    // -------------------------------------------------------------
    logger.info('🌱 Verifying and upserting demo accounts and default policies...');
    await client.query('BEGIN');

    const passwordHash = await argon2.hash('DemoSecurity2026!', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 2a. Upsert Demo Users
    const ownerRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           is_active = true
       RETURNING id, full_name, email`,
      ['Alex Rivera', 'alex.security@acmecorp.internal', passwordHash]
    );
    const ownerUser = ownerRes.rows[0];

    const analystRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           is_active = true
       RETURNING id, full_name, email`,
      ['Maya Lin', 'maya.analyst@acmecorp.internal', passwordHash]
    );
    const analystUser = analystRes.rows[0];

    // 2b. Upsert Demo Organization
    const orgRes = await client.query(
      `INSERT INTO organizations (name, slug, settings)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE 
       SET name = EXCLUDED.name
       RETURNING id, name, slug`,
      [
        'Acme Defense Labs',
        'acme-defense-labs',
        JSON.stringify({ defaultRetentionDays: 90, requireHumanApproval: true }),
      ]
    );
    const org = orgRes.rows[0];

    // 2c. Upsert Organization Memberships
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (organization_id, user_id) DO UPDATE 
       SET role = 'owner', status = 'active'`,
      [org.id, ownerUser.id]
    );

    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'analyst', 'active')
       ON CONFLICT (organization_id, user_id) DO UPDATE 
       SET role = 'analyst', status = 'active'`,
      [org.id, analystUser.id]
    );

    // 2d. Upsert Default Policies into security_policies
    const defaultPolicies = [
      {
        name: 'Authentication Brute Force Threshold',
        description: 'Generates alerts when >= 5 failed logins occur within 5 minutes from a single IP or user.',
        category: 'authentication',
        policyType: 'brute_force_rule',
        configuration: { threshold: 5, windowMinutes: 5, action: 'alert' },
      },
      {
        name: 'Data Exfiltration Sentinel',
        description: 'Detects and flags bulk export events involving more than 1,000 records or restricted datasets.',
        category: 'suspicious_export',
        policyType: 'export_volume_rule',
        configuration: { maxRecordLimit: 1000, maxByteLimit: 50000000 },
      },
      {
        name: 'Sensitive Secret Redaction Policy',
        description: 'Mandates automated redaction for API keys, JWTs, and payment cards prior to persistence or AI analysis.',
        category: 'sensitive_data',
        policyType: 'privacy_redaction_rule',
        configuration: { categories: ['api_key', 'jwt', 'payment_card', 'private_key'], autoRedact: true },
      },
    ];

    for (const p of defaultPolicies) {
      await client.query(
        `INSERT INTO security_policies (organization_id, name, description, category, policy_type, configuration, is_enabled, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (organization_id, name) DO UPDATE SET configuration = EXCLUDED.configuration`,
        [org.id, p.name, p.description, p.category, p.policyType, JSON.stringify(p.configuration), ownerUser.id]
      );
    }

    await client.query('COMMIT');
    logger.info('✅ Database schema and demo credentials verified and ready.');
    return true;
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    logger.warn({ err: err.message }, '⚠️ Auto database setup encountered an issue. Continuing server execution...');
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}
