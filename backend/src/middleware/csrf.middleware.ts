import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Ensures a CSRF token exists on the session
 */
export function getOrCreateCsrfToken(req: Request): string {
  if (!req.session) {
    return crypto.randomBytes(32).toString('hex');
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

/**
 * Verifies the X-CSRF-Token header on state-changing requests
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not modify state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Exempt auth bootstrap endpoints if session is not yet established
  if (req.path.endsWith('/auth/login') || req.path.endsWith('/auth/register') || req.path.endsWith('/health') || req.path.endsWith('/auth/clerk-webhook')) {
    next();
    return;
  }

  // Bearer token requests (e.g. Clerk JWT) are immune to CSRF because browsers do not attach Authorization headers automatically
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  // Skip CSRF verification in automated integration tests when explicitly bypassed
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-bypass-csrf'] === 'true') {
    next();
    return;
  }

  const sessionToken = req.session?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!sessionToken || typeof headerToken !== 'string') {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'A valid X-CSRF-Token header is required for this request.',
      },
    });
    return;
  }

  try {
    const sessionBuffer = Buffer.from(sessionToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    if (
      sessionBuffer.length !== headerBuffer.length ||
      !crypto.timingSafeEqual(sessionBuffer, headerBuffer)
    ) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'The submitted CSRF token is invalid or has expired.',
        },
      });
      return;
    }
  } catch {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VERIFICATION_FAILED',
        message: 'Security validation failed.',
      },
    });
    return;
  }

  next();
}

