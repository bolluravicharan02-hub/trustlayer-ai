import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { appPool } from './config/database.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { verifyCsrf } from './middleware/csrf.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// Route imports
import { healthRouter } from './modules/health/health.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { organizationsRouter } from './modules/organizations/organizations.router.js';
import { eventsRouter } from './modules/events/events.router.js';
import { alertsRouter } from './modules/alerts/alerts.router.js';
import { privacyRouter } from './modules/privacy/privacy.router.js';
import { policiesRouter } from './modules/policies/policies.router.js';
import { trustRouter } from './modules/trust/trust.router.js';
import { auditRouter } from './modules/audit/audit.router.js';
import { reportsRouter } from './modules/reports/reports.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';

export function createApp(): Express {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  // Security Headers with relaxed CSP for Clerk auth, Google Fonts, and Grok AI integrations
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com",
          "https://api.x.ai",
          "https://api.groq.com",
          "https://*.supabase.co"
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://img.clerk.com", "https://*.clerk.com"],
        workerSrc: ["'self'", "blob:"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS Configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      // or if origin is explicitly allowed or matches preview / deployment hosts (*.onrender.com, *.vercel.app)
      const isAllowed =
        !origin ||
        origin === 'null' ||
        env.ALLOWED_ORIGINS.includes(origin) ||
        env.NODE_ENV === 'development' ||
        (typeof origin === 'string' && (
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.vercel.app')
        ));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Organization-Id', 'X-Request-ID'],
    exposedHeaders: ['X-CSRF-Token', 'X-Request-ID'],
  }));

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Correlation ID
  app.use(requestIdMiddleware);

  // Clerk authentication middleware (active when Clerk keys are provided)
  if (env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
    app.use(clerkMiddleware({
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    }));
  }

  // Session Store setup
  let sessionStore: session.Store | undefined;
  if (env.NODE_ENV !== 'test') {
    const PgStore = pgSession(session);
    sessionStore = new PgStore({
      pool: appPool,
      tableName: 'session',
      createTableIfMissing: true,
      errorLog: (err) => {
        // Suppress noisy reconnection logs in dev if DB is starting up
      },
    });
  }

  app.use(session({
    store: sessionStore,
    name: env.SESSION_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: env.SESSION_MAX_AGE_MS,
    },
  }));

  // CSRF Protection on state-changing requests
  app.use(verifyCsrf);

  // Mount API Endpoints under env.API_PREFIX (e.g. /api/v1) and fallback root (/)
  const apiRouter = express.Router();

  apiRouter.use(healthRouter);
  apiRouter.use(authRouter);
  apiRouter.use(organizationsRouter);
  apiRouter.use(eventsRouter);
  apiRouter.use(alertsRouter);
  apiRouter.use(privacyRouter);
  apiRouter.use(policiesRouter);
  apiRouter.use(trustRouter);
  apiRouter.use(auditRouter);
  apiRouter.use(reportsRouter);
  apiRouter.use(dashboardRouter);

  // Mount at configured prefix (/api/v1)
  app.use(env.API_PREFIX, apiRouter);

  // Also mount at root (/) so /auth/login, /health, etc. resolve directly
  // regardless of whether the frontend passes or omits /api/v1
  if (env.API_PREFIX !== '/') {
    app.use(apiRouter);
  }

  // In production, serve the frontend SPA if the build directory exists
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const possibleFrontendDirs = [
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../../../frontend/dist'),
  ];

  for (const dir of possibleFrontendDirs) {
    if (fs.existsSync(dir)) {
      app.use(express.static(dir));
      app.get('*', (req, res, next) => {
        // Explicit API endpoints and health checks pass through to API router / 404 handler
        if (
          req.path.startsWith(env.API_PREFIX) ||
          req.path.startsWith('/api') ||
          req.path.startsWith('/health')
        ) {
          return next();
        }
        res.sendFile(path.join(dir, 'index.html'));
      });
      break;
    }
  }

  // Explicit structured JSON 404 for unmatched API requests so client never receives HTML error pages
  app.use((req, res, next) => {
    const isApiRequest =
      req.path.startsWith('/api') ||
      req.path.startsWith(env.API_PREFIX) ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/auth') ||
      Boolean(req.headers.accept?.includes('application/json'));

    if (isApiRequest || req.method !== 'GET') {
      res.status(404).json({
        success: false,
        error: {
          code: 'API_ENDPOINT_NOT_FOUND',
          message: `API endpoint '${req.method} ${req.originalUrl}' not found. Check the endpoint URL and HTTP method.`,
        },
      });
      return;
    }
    next();
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
