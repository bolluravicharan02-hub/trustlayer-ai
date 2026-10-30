import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Check if SSL is required (Supabase, Neon, or explicit flag)
const isSslRequired =
  env.DATABASE_SSL ||
  env.DATABASE_URL.includes('supabase.co') ||
  env.DATABASE_URL.includes('pooler.supabase.com') ||
  env.DATABASE_URL.includes('sslmode=require');

const sslConfig = isSslRequired ? { rejectUnauthorized: false } : false;

// Pool for migrations and administrative setup (can bypass RLS if configured)
export const adminPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Restricted application runtime pool (Enforces RLS)
export const appPool = new Pool({
  connectionString: env.DATABASE_APP_URL,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

adminPool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error on admin pool');
});

appPool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error on app pool');
});

/**
 * Health check helper to verify database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const res = await appPool.query('SELECT 1 as connected');
    return res.rows[0]?.connected === 1;
  } catch (err) {
    logger.warn({ err }, 'Database connection check failed');
    return false;
  }
}

