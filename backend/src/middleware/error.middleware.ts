import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error & { statusCode?: number; code?: string; details?: unknown },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  logger.error(
    {
      err: {
        message: err.message,
        name: err.name,
        code: err.code,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      orgId: req.organization?.id,
    },
    'Request encountered an unhandled error'
  );

  const safeMessage = statusCode >= 500 && env.NODE_ENV === 'production'
    ? 'An unexpected internal server error occurred.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: safeMessage,
      details: err.details || [],
    },
  });
}

