import { Router, Request, Response } from 'express';
import { testDatabaseConnection } from '../../config/database.js';
import { isGrokConfigured } from '../../config/grok.js';
import { env } from '../../config/env.js';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      app: env.APP_NAME,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

healthRouter.get('/ready', async (req: Request, res: Response) => {
  const dbConnected = await testDatabaseConnection();
  const grokAvailable = isGrokConfigured();

  const isReady = dbConnected;

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    data: {
      ready: isReady,
      checks: {
        database: dbConnected ? 'connected' : 'disconnected',
        grok: grokAvailable ? 'configured' : 'fallback_mode',
      },
      model: env.GROK_MODEL,
      timestamp: new Date().toISOString(),
    },
  });
});
