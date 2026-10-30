import express, { Express } from 'express';
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

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS Configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or if origin is allowed
      if (!origin || env.ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
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

  // Mount API Endpoints under /api/v1
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

  app.use(env.API_PREFIX, apiRouter);

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
