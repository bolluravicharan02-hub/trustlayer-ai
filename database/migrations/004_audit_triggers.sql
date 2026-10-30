-- ============================================================================
-- TrustLayer AI - Migration 004: Audit Immutability Triggers
-- ============================================================================

-- Function to reject any UPDATE or DELETE operations on the audit_logs table
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs are append-only and cannot be modified. Violating ID: %', OLD.id
      USING ERRCODE = 'integrity_constraint_violation';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs are append-only and cannot be deleted. Violating ID: %', OLD.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce immutability on audit_logs
DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

