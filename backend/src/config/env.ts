import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Determine intelligent defaults for xAI Grok vs GroqCloud (handles gsk_ vs xai- keys)
const rawGrokKey = (process.env.GROK_API_KEY || process.env.XAI_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '').trim();
const isGroqCloudKey = rawGrokKey.startsWith('gsk_');
const defaultAiModel = isGroqCloudKey ? 'llama-3.3-70b-versatile' : 'grok-2-latest';
const defaultAiBaseUrl = isGroqCloudKey ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  APP_NAME: z.string().default('TrustLayer AI'),
  API_PREFIX: z.string().default('/api/v1'),

  // Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/trustlayer'),
  DATABASE_APP_URL: z.string().optional(),
  DATABASE_SSL: z.string().transform(v => v === 'true').default('false'),

  // Authentication & Session
  SESSION_SECRET: z.string().min(16, 'Session secret must be at least 16 characters').default('super-secret-development-session-key-change-in-production-12345'),
  SESSION_NAME: z.string().default('trustlayer.sid'),
  SESSION_MAX_AGE_MS: z.coerce.number().default(86400000), // 24 hours

  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // CORS & Cookies
  FRONTEND_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.string().transform(v => v === 'true').default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY: z.string().transform(v => v === 'true').default('false'),

  // xAI Grok / Groq AI
  GROK_API_KEY: z.string().optional().default(() => rawGrokKey),
  GROK_MODEL: z.string().default(() => process.env.GROK_MODEL || defaultAiModel),
  GROK_BASE_URL: z.string().default(() => process.env.GROK_BASE_URL || defaultAiBaseUrl),
  GROK_TIMEOUT_MS: z.coerce.number().default(30000),
  GROK_MAX_OUTPUT_TOKENS: z.coerce.number().default(2048),

  // File Upload Limits
  MAX_UPLOAD_BYTES: z.coerce.number().default(5242880), // 5MB
  MAX_IMPORT_ROWS: z.coerce.number().default(5000),
  MAX_JSON_DEPTH: z.coerce.number().default(20),

  // Rate Limiting (per minute)
  LOGIN_RATE_LIMIT: z.coerce.number().default(10),
  API_RATE_LIMIT: z.coerce.number().default(200),
  AI_RATE_LIMIT: z.coerce.number().default(10),
  UPLOAD_RATE_LIMIT: z.coerce.number().default(10),

  // Retention & Privacy
  DEFAULT_RETENTION_DAYS: z.coerce.number().default(90),
  ENABLE_RAW_UPLOAD_PERSISTENCE: z.string().transform(v => v === 'true').default('false'),

  // Logging
  LOG_LEVEL: z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment variable validation failed');
}

export const env = {
  ...parsed.data,
  DATABASE_APP_URL: parsed.data.DATABASE_APP_URL || parsed.data.DATABASE_URL,
  ALLOWED_ORIGINS: parsed.data.FRONTEND_ORIGINS.split(',').map(o => o.trim()),
};

