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
 * Ensures database schema and essential demo seed data are initialized
 * automatically when the backend boots up in production or development.
 */
export async function ensureDatabaseReady(): Promise<boolean> {
  // Skip in test environment to avoid interfering with mocks/in-memory DB
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
    // 1. Check if core tables exist
    const tableCheck = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    const hasTables = tableCheck.rows.length > 0;

    if (!hasTables) {
      logger.info('📦 Database tables not found. Automatically running schema migrations...');

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
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort();

        await client.query(`
          CREATE TABLE IF NOT EXISTS _schema_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

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
              await client.query('INSERT INTO _schema_migrations (name) VALUES ($1)', [file]);
              await client.query('COMMIT');
              logger.info(`✅ Migration applied: ${file}`);
            } catch (migErr) {
              await client.query('ROLLBACK');
              logger.error({ migErr, file }, `❌ Migration failed: ${file}`);
              throw migErr;
            }
          }
        }
      } else {
        logger.warn('⚠️ Migrations directory not located, skipping automated SQL migration.');
      }
    }

    // 2. Check and seed demo admin user if not present
    const userCheck = await client.query(
      `SELECT id FROM users WHERE email = 'alex.security@acmecorp.internal'`
    );

    if (userCheck.rows.length === 0) {
      logger.info('🌱 Seeding demo accounts (alex.security@acmecorp.internal)...');
      await client.query('BEGIN');

      const passwordHash = await argon2.hash('DemoSecurity2026!', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      // Insert Demo Users
      const ownerRes = await client.query(
        `INSERT INTO users (full_name, email, password_hash, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id, full_name, email`,
        ['Alex Rivera', 'alex.security@acmecorp.internal', passwordHash]
      );
      const ownerUser = ownerRes.rows[0];

      const analystRes = await client.query(
        `INSERT INTO users (full_name, email, password_hash, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id, full_name, email`,
        ['Maya Lin', 'maya.analyst@acmecorp.internal', passwordHash]
      );
      const analystUser = analystRes.rows[0];

      // Insert Demo Organization
      const orgRes = await client.query(
        `INSERT INTO organizations (name, slug, settings)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name, slug`,
        [
          'Acme Defense Labs',
          'acme-defense-labs',
          JSON.stringify({ defaultRetentionDays: 90, requireHumanApproval: true }),
        ]
      );
      const org = orgRes.rows[0];

      // Insert Memberships
      await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (organization_id, user_id) DO NOTHING`,
        [org.id, ownerUser.id]
      );

      await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role, status)
         VALUES ($1, $2, 'analyst', 'active')
         ON CONFLICT (organization_id, user_id) DO NOTHING`,
        [org.id, analystUser.id]
      );

      // Insert Default Detection Policies
      const defaultPolicies = [
        {
          name: 'Brute Force Authentication Detection',
          description: 'Triggers a High severity alert when 5 or more failed login attempts are detected within 10 minutes.',
          policyType: 'detection',
          severity: 'high',
          action: 'alert',
          rules: { eventType: 'auth.login_failed', thresholdCount: 5, timeWindowMinutes: 10, riskScoreAddition: 40 },
        },
        {
          name: 'Sensitive PII & Secret Redaction Policy',
          description: 'Scans for exposed API tokens, passwords, credit card numbers, and SSNs in log payloads.',
          policyType: 'privacy',
          severity: 'critical',
          action: 'redact',
          rules: { detectCategories: ['secret', 'financial', 'government_id', 'contact'], autoRedact: true },
        },
        {
          name: 'Privilege Escalation Monitor',
          description: 'Monitors unauthorized role modifications and administrator grant events.',
          policyType: 'detection',
          severity: 'critical',
          action: 'quarantine',
          rules: { eventType: 'role.promoted', suspiciousTargetRoles: ['admin', 'owner'], riskScoreAddition: 55 },
        },
      ];

      for (const p of defaultPolicies) {
        await client.query(
          `INSERT INTO policies (organization_id, name, description, policy_type, severity, action, rules, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           ON CONFLICT DO NOTHING`,
          [org.id, p.name, p.description, p.policyType, p.severity, p.action, JSON.stringify(p.rules)]
        );
      }

      await client.query('COMMIT');
      logger.info('✅ Database schema verified and demo accounts initialized successfully.');
    } else {
      logger.info('✅ Database verified: Tables and accounts are ready.');
    }

    return true;
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    logger.warn({ err: err.message }, '⚠️ Auto database setup encountered a warning. Continuing startup...');
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

