import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let genAIInstance: GoogleGenAI | null = null;

if (env.GEMINI_API_KEY) {
  try {
    genAIInstance = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
    logger.info({ model: env.GEMINI_MODEL }, 'Google Gemini SDK initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Google Gemini SDK');
  }
} else {
  logger.warn('GEMINI_API_KEY is not set. AI operations will run in local explanation mode.');
}

export const genAI = genAIInstance;
export const isGeminiConfigured = (): boolean => Boolean(genAIInstance && env.GEMINI_API_KEY);

