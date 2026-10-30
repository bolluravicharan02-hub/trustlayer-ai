-- ============================================================================
-- TrustLayer AI - Migration 003: Row Level Security (RLS) Policies
-- ============================================================================

-- Helper function to extract current session org id
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to extract current session user id
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1. Organizations table RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_isolation_policy ON organizations;
CREATE POLICY organizations_isolation_policy ON organizations
FOR ALL
USING (
  id = get_current_org_id()
  OR EXISTS (
    SELECT 1 FROM organization_memberships om
    WHERE om.organization_id = organizations.id
    AND om.user_id = get_current_user_id()
    AND om.status = 'active'
  )
)
WITH CHECK (
  id = get_current_org_id()
);

-- 2. Organization Memberships table RLS
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memberships_isolation_policy ON organization_memberships;
CREATE POLICY memberships_isolation_policy ON organization_memberships
FOR ALL
USING (
  user_id = get_current_user_id()
  OR organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 3. Organization Invitations table RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_isolation_policy ON organization_invitations;
CREATE POLICY invitations_isolation_policy ON organization_invitations
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 4. Security Events table RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_events_tenant_policy ON security_events;
CREATE POLICY security_events_tenant_policy ON security_events
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 5. Security Alerts table RLS
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_alerts_tenant_policy ON security_alerts;
CREATE POLICY security_alerts_tenant_policy ON security_alerts
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 6. Privacy Scans table RLS
ALTER TABLE privacy_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_scans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS privacy_scans_tenant_policy ON privacy_scans;
CREATE POLICY privacy_scans_tenant_policy ON privacy_scans
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 7. Privacy Findings table RLS
ALTER TABLE privacy_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_findings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS privacy_findings_tenant_policy ON privacy_findings;
CREATE POLICY privacy_findings_tenant_policy ON privacy_findings
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 8. Security Policies table RLS
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_policies_tenant_policy ON security_policies;
CREATE POLICY security_policies_tenant_policy ON security_policies
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 9. AI Analysis Runs table RLS
ALTER TABLE ai_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_analysis_runs_tenant_policy ON ai_analysis_runs;
CREATE POLICY ai_analysis_runs_tenant_policy ON ai_analysis_runs
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 10. Audit Logs table RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_tenant_policy ON audit_logs;
CREATE POLICY audit_logs_tenant_policy ON audit_logs
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

-- 11. Alert Notes table RLS
ALTER TABLE alert_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_notes_tenant_policy ON alert_notes;
CREATE POLICY alert_notes_tenant_policy ON alert_notes
FOR ALL
USING (
  organization_id = get_current_org_id()
)
WITH CHECK (
  organization_id = get_current_org_id()
);

