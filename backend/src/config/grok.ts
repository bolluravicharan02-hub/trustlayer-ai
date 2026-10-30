import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const isGrokConfigured = (): boolean => Boolean(env.GROK_API_KEY && env.GROK_API_KEY.trim().length > 0);

if (isGrokConfigured()) {
  logger.info({ model: env.GROK_MODEL, baseUrl: env.GROK_BASE_URL }, 'xAI Grok client configured successfully');
} else {
  logger.warn('GROK_API_KEY is not set. AI operations will run in local explanation mode.');
}

