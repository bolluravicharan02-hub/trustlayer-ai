# TrustLayer AI - Backend Service

Enterprise-grade backend for **TrustLayer AI**, a privacy-first security monitoring and AI explainability platform.

## Architecture Highlights

- **Framework**: Express.js (TypeScript, ES2022 / NodeNext)
- **Database Connectivity**: PostgreSQL via `pg` connection pool with transaction-scoped Row-Level Security (`set_config('app.current_org_id', ..., true)`)
- **Authentication**: Password hashing with Argon2id, PostgreSQL session storage via `connect-pg-simple`, CSRF synchronizer token protection
- **Threat Detection Engine**: Deterministic rules for brute force, privilege escalation, suspicious data export, unusual access patterns, sensitive data exposure, and high-risk events
- **Privacy Engine**: High-fidelity sensitive data scanner (emails, phone numbers, Luhn-verified credit cards, API keys, bearer tokens, JWTs, private keys, IPv4/IPv6, custom regex) with category-based redaction
- **AI Intelligence**: Google Gemini (`@google/genai`) with structured JSON schema output, Zod runtime validation, and strict prompt injection defense
- **Audit Logging**: SHA-256 cryptographic hash chain with database triggers preventing modification/deletion, plus an automated hash integrity verifier (`/api/v1/audit/verify`)

---

## Prerequisites

- Node.js 22 LTS or newer
- PostgreSQL 15+ (Replit PostgreSQL, Neon, Supabase, or local instance)
- Google Gemini API Key (optional for basic detection, required for live AI explanations)

---

## Setup & Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials and GEMINI_API_KEY
   ```

3. Run database migrations:
   ```bash
   npm run db:migrate
   ```

4. (Optional) Seed demo dataset:
   ```bash
   npm run db:seed
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

---

## Running Tests

```bash
npm run test
```

Includes unit, integration, and security tests covering:
- Argon2id password hashing and session management
- Deterministic threat detection rules
- Privacy scanner regex & Luhn validation
- Categorical data redaction
- SHA-256 audit hash chain integrity
- RLS tenant data isolation

