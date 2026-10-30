-- ============================================================================
-- TrustLayer AI - Migration 002: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_memberships_user
ON organization_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_organization
ON organization_memberships(organization_id);

CREATE INDEX IF NOT EXISTS idx_events_org_occurred
ON security_events(organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type
ON security_events(organization_id, event_type);

CREATE INDEX IF NOT EXISTS idx_events_actor
ON security_events(organization_id, actor_identifier);

CREATE INDEX IF NOT EXISTS idx_alerts_org_status
ON security_alerts(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_alerts_org_severity
ON security_alerts(organization_id, severity);

CREATE INDEX IF NOT EXISTS idx_alerts_created
ON security_alerts(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_risk_score
ON security_alerts(organization_id, risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_scans_org
ON privacy_scans(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_findings_scan
ON privacy_findings(scan_id);

CREATE INDEX IF NOT EXISTS idx_privacy_findings_category
ON privacy_findings(organization_id, category);

CREATE INDEX IF NOT EXISTS idx_policies_org_enabled
ON security_policies(organization_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_ai_runs_org_created
ON ai_analysis_runs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_runs_alert
ON ai_analysis_runs(alert_id);

CREATE INDEX IF NOT EXISTS idx_audit_org_created
ON audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action
ON audit_logs(organization_id, action);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires
ON rate_limit_buckets(expires_at);

CREATE INDEX IF NOT EXISTS idx_alert_notes_alert
ON alert_notes(alert_id, created_at ASC);

