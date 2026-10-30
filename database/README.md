# TrustLayer AI - Database Architecture & Migrations

This directory contains the schema migrations, indexing, security policies, and seed data for **TrustLayer AI**.

## Database Engine

- **Primary Database**: PostgreSQL 15+ (Replit PostgreSQL / Neon / Self-Hosted PostgreSQL)
- **Primary Keys**: UUID (`gen_random_uuid()`)
- **Isolation Mechanism**: PostgreSQL Native Row-Level Security (RLS) + Tenant-Scoped Session Variables (`app.current_org_id`, `app.current_user_id`, `app.current_role`)
- **Immutability Protection**: Cryptographic Hash-Chained Audit Logs with SHA-256 and Database-Enforced Triggers rejecting `UPDATE` and `DELETE`.

---

## Migration Files

1. `001_initial_schema.sql`:
   - Extensions (`pgcrypto`)
   - Custom ENUM types (`membership_role`, `alert_severity`, `alert_status`, `privacy_finding_status`, `analysis_status`)
   - Core tables: `users`, `organizations`, `organization_memberships`, `organization_invitations`, `security_events`, `security_alerts`, `privacy_scans`, `privacy_findings`, `security_policies`, `ai_analysis_runs`, `audit_logs`, `rate_limit_buckets`, `alert_notes`, `session`.
   - Automatic `updated_at` triggers.

2. `002_indexes.sql`:
   - Performance and sorting indexes for tenant queries, event occurrences, alert status/severity, privacy scans, and audit log lookups.

3. `003_rls_policies.sql`:
   - Row Level Security enabled and forced across all tenant-owned tables.
   - Enforces `organization_id = get_current_org_id()` on all reads and writes.

4. `004_audit_triggers.sql`:
   - Append-only integrity enforcement trigger `prevent_audit_log_modification()` on `audit_logs`.

---

## RLS & Runtime Roles

### Dual-Role Architecture
1. **Migration / Admin Role (`DATABASE_URL`)**:
   - Used only during deployment migrations (`npm run db:migrate`) to apply DDL, create tables, triggers, and RLS policies.
2. **Restricted Runtime Role (`DATABASE_APP_URL`)**:
   - Used by the Node.js API server for regular transactions.
   - Does **not** possess `BYPASSRLS` or superuser privileges.
   - Enforces tenant isolation even if an application query omits an explicit `WHERE organization_id = ...` clause.

### Tenant Context Session Setting
Each tenant query executes inside a transaction where session variables are set:
```sql
SELECT set_config('app.current_user_id', $1, true);
SELECT set_config('app.current_org_id', $2, true);
SELECT set_config('app.current_role', $3, true);
```
`true` ensures variables are transaction-scoped and cleared upon commit or rollback.

---

## Cryptographic Audit Hash Chain

Every audit entry contains:
- `previous_hash`: SHA-256 hash of the preceding organization audit log entry.
- `entry_hash`: `SHA-256(previous_hash + canonical_json_metadata + action + timestamp + actor_id + resource_id)`.
- The organization record tracks the current `audit_head_hash` under a row lock (`SELECT ... FOR UPDATE`), preventing race conditions.
- Cryptographic verification endpoint: `GET /api/v1/audit/verify`.

---

## Running Migrations and Seeds

```bash
# Execute SQL migrations in sequential order
npm run db:migrate

# Seed development/demo data
npm run db:seed
```

