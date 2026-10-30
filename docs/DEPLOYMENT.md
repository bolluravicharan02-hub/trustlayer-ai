# TrustLayer AI - Deployment & Operations Guide

TrustLayer AI is engineered for independent frontend and backend deployment.

---

## 1. Environment Checklist

### Backend Production Environment (`backend/.env`)
```env
NODE_ENV=production
PORT=5000
APP_NAME=TrustLayer AI
API_PREFIX=/api/v1

# PostgreSQL connection strings
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DB?sslmode=require
DATABASE_APP_URL=postgresql://APP_USER:PASS@HOST:5432/DB?sslmode=require
DATABASE_SSL=true

# Clerk Authentication (From Clerk Dashboard -> API Keys)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Authentication (Fallback & Session)
SESSION_SECRET=REPLACE_WITH_A_SECURE_64_BYTE_RANDOM_STRING
SESSION_NAME=trustlayer.sid
SESSION_MAX_AGE_MS=86400000

# CORS & Cookies
FRONTEND_ORIGINS=https://app.trustlayer.ai
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
TRUST_PROXY=true

# xAI Grok API (From https://console.x.ai)
GROK_API_KEY=xai-...
GROK_MODEL=grok-2-latest
GROK_BASE_URL=https://api.x.ai/v1
GROK_TIMEOUT_MS=30000
GROK_MAX_OUTPUT_TOKENS=2048

# Upload & Rate Limits
MAX_UPLOAD_BYTES=5242880
MAX_IMPORT_ROWS=5000
LOGIN_RATE_LIMIT=10
API_RATE_LIMIT=200
AI_RATE_LIMIT=10
```

### Frontend Production Environment (`frontend/.env`)
```env
VITE_APP_NAME=TrustLayer AI
VITE_API_BASE_URL=https://api.trustlayer.ai/api/v1
VITE_APP_ENV=production

# Clerk Publishable Key (From Clerk Dashboard -> API Keys)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## 2. PostgreSQL Setup & Migrations

1. Connect with the administrative database role and execute SQL migrations:
   ```bash
   npm run db:migrate --prefix backend
   ```
2. Verify that the migrations table `_schema_migrations` applied `001_initial_schema.sql`, `002_indexes.sql`, `003_rls_policies.sql`, and `004_audit_triggers.sql`.
3. (Optional for staging/demo environments) Seed test dataset:
   ```bash
   npm run db:seed --prefix backend
   ```

---

## 3. Backend Service Deployment (Docker / VPS / Cloud Run)

### Build and Start
```bash
cd backend
npm ci
npm run build
NODE_ENV=production npm start
```

### Health & Readiness Probes
- **Liveness Probe**: `GET /api/v1/health` (returns 200 OK)
- **Readiness Probe**: `GET /api/v1/ready` (verifies PostgreSQL pool connection and Grok readiness)

---

## 4. Frontend Client Deployment (Vercel / Cloudflare Pages / Nginx)

### Build
```bash
cd frontend
npm ci
npm run build
```
The output directory is `frontend/dist`.

### SPA Routing Fallback (Nginx Configuration Example)
```nginx
server {
    listen 443 ssl http2;
    server_name app.trustlayer.ai;

    root /var/www/trustlayer/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

