# TrustLayer AI
### Enterprise AI-Powered Security, Privacy & Trust Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)
[![xAI Grok](https://img.shields.io/badge/xAI_Grok-grok--2--latest-black.svg)](https://x.ai/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

## 1. Project Overview

**TrustLayer AI** is an enterprise-grade SaaS security platform engineered to unify **threat detection**, **privacy redaction**, and **explainable AI reasoning** into a single cohesive system.

### The Core Problem
Organizations continuously collect high-velocity application logs, security event streams, and audit records. Traditional monitoring tools suffer from two major flaws:
1. **Opaque Technical Alerts**: Complex security telemetry is dumped onto analysts without explainable context or risk justification.
2. **Severe Privacy Risks with AI**: Security teams attempting to use LLMs frequently expose raw user PII, API tokens, passwords, and payment cards directly to third-party AI APIs without suitable safeguards.

### The TrustLayer AI Solution
TrustLayer AI bridges this gap through a deterministic-first architecture:
- **Security Intelligence**: Evaluates incoming events against mathematically verified deterministic security rules, assigning bounded risk scores from $0$ to $100$.
- **Privacy Intelligence**: An independent scanner identifies sensitive data (including credit cards verified via the mathematical **Luhn algorithm**, API keys, Bearer tokens, and JWTs) and **redacts them automatically** before storage or model processing.
- **Explainable AI Trust**: xAI Grok analyzes sanitized event context to explain root causes, plausible alternative hypotheses, and safe remediation steps—clearly distinguishing deterministic findings from probabilistic AI reasoning with mandatory human review.
- **Cryptographic Auditability**: An append-only audit trail links every action into a **SHA-256 hash chain** protected by database triggers that reject any modification or deletion.

---

## 2. Full-Stack Technology Stack

### Frontend Client
- **Framework**: React 18 SPA built with **Vite** and **TypeScript**
- **Authentication**: **Clerk** (`@clerk/clerk-react`) with Passkeys, MFA, and SSO + dual-mode fallback
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with custom dark cybersecurity palette (Navy/Slate/Blue/Teal/Rose)
- **Data Fetching & Caching**: TanStack Query (React Query)
- **Form Validation**: React Hook Form + Zod
- **Visualizations**: Recharts (Timeline Area Charts, Severity Bar Charts, Privacy Distribution)
- **Iconography**: Lucide React
- **Notifications**: Sonner

### Backend Service
- **Runtime**: Node.js 22 LTS
- **Framework**: Express.js (TypeScript, ES2022 / NodeNext modules)
- **Database Driver**: `pg` (PostgreSQL Connection Pooling, Supabase SSL)
- **Authentication**: **Clerk** JWT verification (`@clerk/backend`, `@clerk/express`) with JIT user/tenant provisioning + Argon2id / sessions fallback
- **CSRF Protection**: Synchronizer-token protection with constant-time verification (`crypto.timingSafeEqual`)
- **AI Integration**: **xAI Grok API** (`grok-2-latest`) with structured JSON schema outputs
- **Security Middleware**: Helmet, restricted in-memory Multer uploads, atomic rate-limiting
- **Logging**: Pino with automated field-level credential redaction

### Database Architecture
- **Engine**: **Supabase PostgreSQL** / PostgreSQL 15+ (Transaction Pooler + Session Pooler supported)
- **Multi-Tenant Isolation**: Native **Row Level Security (RLS)** using transaction-scoped session settings:
  ```sql
  SELECT set_config('app.current_user_id', $1, true);
  SELECT set_config('app.current_org_id', $2, true);
  SELECT set_config('app.current_role', $3, true);
  ```
- **Audit Immutability**: Database triggers reject `UPDATE` and `DELETE` on `audit_logs`
- **Audit Hash Chaining**: Sequential SHA-256 hash linkage tracked by `audit_head_hash` under row locks

---

## 3. Directory Structure

```text
trustlayer-ai/
│
├── frontend/                     # React 18 + Vite + TypeScript Client
│   ├── src/
│   │   ├── app/                  # App shell, Router, and Provider tree
│   │   ├── components/           # Common badges, gauges, modals & layout
│   │   ├── contexts/             # AuthContext (session, org switcher, CSRF)
│   │   ├── pages/                # Public, Auth, and Dashboard routes
│   │   ├── services/             # Axios API client with automatic CSRF & Org ID
│   │   └── types/                # Strict TypeScript contracts
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── backend/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/               # Zod env validation, Database pools, xAI Grok API
│   │   ├── database/             # Tenant transaction wrapper & migration runner
│   │   ├── middleware/           # Auth, RLS org member check, CSRF, rate limit
│   │   ├── modules/              # REST routes: auth, events, alerts, privacy, etc.
│   │   ├── services/             # Detection engine, Privacy scanner, Redaction, Audit
│   │   ├── schemas/              # Zod validation schemas
│   │   └── server.ts             # Entrypoint & graceful shutdown
│   ├── tests/                    # Vitest unit & integration test suites
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── database/                     # PostgreSQL Migrations & Seeds
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_indexes.sql
│   │   ├── 003_rls_policies.sql
│   │   └── 004_audit_triggers.sql
│   ├── seeds/
│   │   └── development-seed.ts   # Demo dataset generator
│   └── README.md
│
├── docs/                         # In-Depth Architectural Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── PRIVACY.md
│   └── DEPLOYMENT.md
│
├── package.json                  # Root workspace package
├── .gitignore
├── LICENSE                       # Apache-2.0
└── README.md
```

---

## 4. Getting Started & Installation

### Prerequisites
- **Node.js**: v22 LTS or newer
- **PostgreSQL**: v15 or newer (or free cloud PostgreSQL like Neon / Supabase / Replit)
- **xAI Grok API Key**: Optional for basic rule detection, required for live AI explanations

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/bolluravicharan02-hub/trustlayer-ai.git
cd trustlayer-ai

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/trustlayer
DATABASE_APP_URL=postgresql://postgres:password@localhost:5432/trustlayer
SESSION_SECRET=c2VjdXJlLXJhbmRvbS1zZXNzaW9uLXNlY3JldC1mb3ItdHJ1c3RsYXllci1haS0yMDI2LXByb2R1Y3Rpb24=
GROK_API_KEY=xai-your_grok_api_key_here
GROK_MODEL=grok-2-latest
FRONTEND_ORIGINS=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```bash
cp frontend/.env.example frontend/.env
```
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 3. Run Database Migrations & Seed Demo Data
```bash
# Run schema, indexes, RLS policies, and immutable triggers
npm run db:migrate --prefix backend

# Seed realistic test dataset (Demo users, brute force alerts, secrets leaks)
npm run db:seed --prefix backend
```

### 4. Start Development Servers
```bash
# Start backend API (Port 5000)
npm run dev --prefix backend

# In a separate terminal, start frontend Vite client (Port 5173)
npm run dev --prefix frontend
```
Navigate your browser to `http://localhost:5173`.

---

## 5. Pre-Seeded Demonstration Accounts

| Role | Email | Password |
|---|---|---|
| **Admin / Owner** | `alex.security@acmecorp.internal` | `DemoSecurity2026!` |
| **Security Analyst** | `maya.analyst@acmecorp.internal` | `DemoSecurity2026!` |

*(The Login page includes quick one-click demo credentials fill buttons for instant testing).*

---

## 6. End-to-End Functional Demonstration Walkthrough

1. **Sign In**: Open `http://localhost:5173/login`, click **"Admin (Alex)"** and sign in.
2. **Dashboard Overview**: Inspect real database-backed KPI cards (Total Events, Open Alerts, Critical Threats, Sensitive Items Redacted).
3. **Ingest Security Events**:
   - Navigate to `/app/events/ingest`.
   - Click the quick test sample button: **"Brute-Force Attack (5 Failures)"**.
   - Click **"Ingest and Analyze Security Logs"**.
   - Notice the summary card confirming events parsed, deterministic alerts generated, and sensitive items redacted.
4. **Investigate Alert with AI Copilot**:
   - Navigate to `/app/alerts` and select the newly generated Brute Force alert.
   - Inspect the **Deterministic Rule Evidence** (`failed_attempts_count = 5`, origin IP).
   - Click **"Explain with AI"**.
   - View the structured Grok report: Incident Summary, Likely Intent, Observations with confidence scores, Alternative Explanations, and Human-in-the-Loop mitigation recommendations.
   - Change the status to **"Investigating"** and post an investigation note.
5. **Interactive Privacy Redaction Studio**:
   - Navigate to `/app/privacy/scan`.
   - Click **"Payment & API Leak"** to load a test log containing a Luhn-valid credit card (`4532-0151-1283-0366`), email, and API key (`sk-...`).
   - Click **"Scan Sensitive Information & Apply Redaction"**.
   - Review the Before/After comparison diff: notice how `4532-0151-1283-0366` is replaced with `[REDACTED_PAYMENT_CARD]` and the API key with `[REDACTED_API_KEY]`.
   - Test the **"Copy Redacted"** or **"Download File"** actions.
6. **Verify Cryptographic Audit Hash Chain**:
   - Navigate to `/app/audit`.
   - Click **"Verify Cryptographic Integrity"**.
   - Watch the backend compute sequential SHA-256 hashes across all audit records and display the verified green badge confirming zero log tampering.
7. **Export Compliance Reports**:
   - Navigate to `/app/reports`.
   - Download the **Threat Detection Report** or **Privacy Exposure Report** as JSON or CSV.

---

## 7. Running Automated Test Suites

```bash
npm run test --prefix backend
```

### Verified Test Results
```
 ✓ tests/unit/detection-engine.test.ts (7 tests)
 ✓ tests/unit/privacy-scanner.test.ts (5 tests)
 ✓ tests/unit/audit-chain.test.ts (3 tests)
 ✓ tests/integration/api.test.ts (4 tests)

 Test Files  4 passed (4)
      Tests  19 passed (19)
```

Test coverage includes:
- Brute-force detection thresholding ($\ge 5$ failures in 5 min)
- Privilege escalation without ticket approval
- Suspicious large exports ($>1,000$ records)
- Luhn algorithm payment card validation (rejects invalid checksums, accepts valid)
- Categorical redaction replacement and recursive JSON object sanitization
- Canonical JSON deterministic serialization and SHA-256 tamper detection
- Synchronizer CSRF protection and input validation rejection

---

## 8. License

TrustLayer AI is licensed under the [Apache License 2.0](LICENSE).

