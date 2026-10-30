import { Request, Response, NextFunction } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateBucket>();

// Cleanup expired buckets every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 60000);

export function rateLimit(limit: number, windowMs = 60000, prefix = 'rl') {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In automated testing, skip rate limit
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${prefix}:${clientIp}`;
    const now = Date.now();

    let bucket = memoryStore.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 1, resetAt: now + windowMs };
      memoryStore.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, limit - bucket.count);
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > limit) {
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please retry in ${retryAfterSeconds} seconds.`,
        },
      });
      return;
    }

    next();
  };
}

