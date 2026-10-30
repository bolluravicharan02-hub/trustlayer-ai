import fs from 'fs';
import path from 'path';
import { adminPool } from '../config/database.js';
import { logger } from '../utils/logger.js';

async function runMigrations() {
  logger.info('🚀 Starting database migrations...');

  const possiblePaths = [
    path.resolve(process.cwd(), 'database/migrations'),
    path.resolve(process.cwd(), '../database/migrations'),
    path.resolve(__dirname, '../../../database/migrations'),
  ];

  let migrationsDir = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      migrationsDir = p;
      break;
    }
  }

  if (!migrationsDir) {
    throw new Error(`Migrations directory not found in: ${possiblePaths.join(', ')}`);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  logger.info(`Found ${migrationFiles.length} migration files: ${migrationFiles.join(', ')}`);

  const client = await adminPool.connect();

  try {
    // Create migrations tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM _schema_migrations WHERE name = $1',
        [file]
      );

      if (alreadyApplied.rows.length > 0) {
        logger.info(`⏩ Migration already applied: ${file}`);
        continue;
      }

      logger.info(`⏳ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`✅ Successfully applied migration: ${file}`);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        logger.error({ migrationErr, file }, `❌ Failed applying migration: ${file}`);
        throw migrationErr;
      }
    }

    logger.info('🎉 All migrations completed successfully.');
  } finally {
    client.release();
    await adminPool.end();
  }
}

runMigrations().catch((err) => {
  logger.error({ err }, 'Fatal error during database migrations');
  process.exit(1);
});
