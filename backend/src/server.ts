import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { testDatabaseConnection, appPool, adminPool } from './config/database.js';
import { ensureDatabaseReady } from './database/auto-setup.js';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`🛡️ ${env.APP_NAME} server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`🔗 API Prefix: ${env.API_PREFIX}`);
  logger.info(`🌐 Allowed Origins: ${env.ALLOWED_ORIGINS.join(', ')}`);

  const dbOk = await testDatabaseConnection();
  if (dbOk) {
    logger.info('✅ PostgreSQL connection verified and ready');
    await ensureDatabaseReady();
  } else {
    logger.warn('⚠️ PostgreSQL connection failed. Ensure DATABASE_URL is configured or run migrations.');
  }
});

// Graceful Shutdown
function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await appPool.end();
      await adminPool.end();
      logger.info('Database pools ended.');
    } catch (err) {
      logger.error({ err }, 'Error closing database pools');
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

