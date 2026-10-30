import { Router, Request, Response } from 'express';
import { testDatabaseConnection } from '../../config/database.js';
import { isGeminiConfigured } from '../../config/gemini.js';
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
  const geminiAvailable = isGeminiConfigured();

  const isReady = dbConnected;

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    data: {
      ready: isReady,
      checks: {
        database: dbConnected ? 'connected' : 'disconnected',
        gemini: geminiAvailable ? 'configured' : 'fallback_mode',
      },
      model: env.GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    },
  });
});

