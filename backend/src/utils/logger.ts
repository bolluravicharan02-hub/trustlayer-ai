import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'password',
      'password_hash',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'creditCard',
      'ssn',
      '*.password',
      '*.token',
      '*.apiKey'
    ],
    censor: '[REDACTED]'
  },
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

