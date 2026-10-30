-- ============================================================================
-- TrustLayer AI - Migration 001: Initial Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$ BEGIN
    CREATE TYPE membership_role AS ENUM (
      'owner',
      'admin',
      'analyst',
      'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM (
      'informational',
      'low',
      'medium',
      'high',
      'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM (
      'open',
      'acknowledged',
      'investigating',
      'resolved',
      'false_positive'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE privacy_finding_status AS ENUM (
      'detected',
      'reviewed',
      'redacted',
      'dismissed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE analysis_status AS ENUM (
      'pending',
      'completed',
      'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_head_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organization Memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- 4. Organization Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role membership_role NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Security Events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(120) NOT NULL,
  source VARCHAR(120) NOT NULL,
  source_event_id VARCHAR(255),
  actor_identifier VARCHAR(255),
  source_ip INET,
  occurred_at TIMESTAMPTZ NOT NULL,
  sanitized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  privacy_scanned BOOLEAN NOT NULL DEFAULT FALSE,
  ingestion_source VARCHAR(30) NOT NULL
    CHECK (
      ingestion_source IN ('manual', 'csv', 'json', 'api')
    ),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to handle null source_event_id properly
CREATE UNIQUE INDEX IF NOT EXISTS uq_security_events_source_id
ON security_events (organization_id, source, source_event_id)
WHERE source_event_id IS NOT NULL;

-- 6. Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID
    REFERENCES security_events(id) ON DELETE SET NULL,
  rule_code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  severity alert_severity NOT NULL,
  risk_score INTEGER NOT NULL
    CHECK (risk_score BETWEEN 0 AND 100),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status alert_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplication index for alerts:
-- When event_id is present, rule_code must be unique per event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_security_alerts_event_rule
ON security_alerts (event_id, rule_code)
WHERE event_id IS NOT NULL;

-- 7. Privacy Scans
CREATE TABLE IF NOT EXISTS privacy_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  scan_type VARCHAR(50) NOT NULL,
  total_findings INTEGER NOT NULL DEFAULT 0,
  redacted_count INTEGER NOT NULL DEFAULT 0,
  risk_level VARCHAR(30),
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  input_digest CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Privacy Findings
CREATE TABLE IF NOT EXISTS privacy_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL
    REFERENCES privacy_scans(id) ON DELETE CASCADE,
  source_event_id UUID
    REFERENCES security_events(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  safe_preview TEXT,
  confidence NUMERIC(4,3)
    CHECK (confidence BETWEEN 0 AND 1),
  detection_method VARCHAR(60),
  status privacy_finding_status NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Security Policies
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  category VARCHAR(80) NOT NULL,
  policy_type VARCHAR(100) NOT NULL,
  configuration JSONB NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

-- 10. AI Analysis Runs
CREATE TABLE IF NOT EXISTS ai_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES security_alerts(id)
    ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES users(id),
  model_name VARCHAR(150) NOT NULL,
  analysis_type VARCHAR(80) NOT NULL,
  prompt_version VARCHAR(40) NOT NULL,
  input_digest CHAR(64),
  output JSONB,
  status analysis_status NOT NULL DEFAULT 'pending',
  error_code VARCHAR(80),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id)
    ON DELETE SET NULL,
  action VARCHAR(150) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash CHAR(64),
  entry_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Rate Limit Buckets
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key CHAR(64) PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 13. Alert Notes / Comments table for investigative collaboration
CREATE TABLE IF NOT EXISTS alert_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL
    REFERENCES security_alerts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- 15. Timestamp Trigger Function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_organizations ON organizations;
CREATE TRIGGER set_timestamp_organizations
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_security_alerts ON security_alerts;
CREATE TRIGGER set_timestamp_security_alerts
BEFORE UPDATE ON security_alerts
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_security_policies ON security_policies;
CREATE TRIGGER set_timestamp_security_policies
BEFORE UPDATE ON security_policies
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

