import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { appPool } from '../config/database.js';
import { env } from '../config/env.js';
import { syncClerkUser } from '../services/clerk-sync.service.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // 1. Check for Clerk Bearer Token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        let clerkUserId: string | undefined;

        if (env.CLERK_SECRET_KEY) {
          const verified = await verifyToken(token, {
            secretKey: env.CLERK_SECRET_KEY,
          });
          clerkUserId = verified.sub;
        } else if (process.env.NODE_ENV === 'test' && token.startsWith('mock_clerk_')) {
          // Allow mock clerk tokens in automated tests without network calls
          clerkUserId = token;
        }

        if (clerkUserId) {
          const syncedUser = await syncClerkUser(clerkUserId);
          if (syncedUser) {
            if (!syncedUser.isActive) {
              res.status(401).json({
                success: false,
                error: {
                  code: 'USER_INACTIVE_OR_NOT_FOUND',
                  message: 'User account has been disabled.',
                },
              });
              return;
            }

            req.user = {
              id: syncedUser.id,
              email: syncedUser.email,
              fullName: syncedUser.fullName,
              isActive: syncedUser.isActive,
              clerkUserId: syncedUser.clerkUserId,
            };
            next();
            return;
          }
        }
      } catch (tokenErr) {
        logger.debug({ tokenErr }, 'Clerk Bearer token verification failed, falling back to session');
      }
    }
  }

  // 2. Fallback to Express Session (for local development, seeds, and automated tests)
  const userId = req.session?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required to access this resource.',
      },
    });
    return;
  }

  try {
    let userRes;
    try {
      userRes = await appPool.query(
        'SELECT id, email, full_name, is_active, clerk_user_id FROM users WHERE id = $1',
        [userId]
      );
    } catch (queryErr: any) {
      if (queryErr.message?.includes('clerk_user_id')) {
        userRes = await appPool.query(
          'SELECT id, email, full_name, is_active FROM users WHERE id = $1',
          [userId]
        );
      } else {
        throw queryErr;
      }
    }

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      req.session.destroy(() => {});
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE_OR_NOT_FOUND',
          message: 'User session is invalid or user account has been disabled.',
        },
      });
      return;
    }

    const row = userRes.rows[0];
    req.user = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      isActive: row.is_active,
      clerkUserId: row.clerk_user_id || undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
}
