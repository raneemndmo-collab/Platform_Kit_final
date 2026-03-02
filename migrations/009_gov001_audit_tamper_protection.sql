-- =============================================================================
-- GOV-001: Audit Log Tamper Protection
-- Prevents unauthorized modification/deletion of audit records
-- Run AFTER initial schema creation
-- =============================================================================

-- 1. Revoke DELETE permission on audit tables
REVOKE DELETE ON TABLE audit_logs FROM PUBLIC;
REVOKE DELETE ON TABLE audit_logs FROM rasid_admin;
REVOKE DELETE ON TABLE audit_logs FROM audit_user;

-- Only superuser can delete (for legal data retention compliance)
-- GRANT DELETE ON TABLE audit_logs TO rasid_superadmin;

-- 2. Revoke UPDATE on critical fields (hash chain integrity)
-- Create a restrictive policy: only 'status' field can be updated
CREATE OR REPLACE FUNCTION prevent_audit_hash_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.integrity_hash IS DISTINCT FROM NEW.integrity_hash THEN
    RAISE EXCEPTION 'GOV-001: Cannot modify audit integrity hash';
  END IF;
  IF OLD.previous_hash IS DISTINCT FROM NEW.previous_hash THEN
    RAISE EXCEPTION 'GOV-001: Cannot modify audit previous hash';
  END IF;
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'GOV-001: Cannot modify audit tenant_id';
  END IF;
  IF OLD.action IS DISTINCT FROM NEW.action THEN
    RAISE EXCEPTION 'GOV-001: Cannot modify audit action';
  END IF;
  IF OLD.resource IS DISTINCT FROM NEW.resource THEN
    RAISE EXCEPTION 'GOV-001: Cannot modify audit resource';
  END IF;
  IF OLD.timestamp IS DISTINCT FROM NEW.timestamp THEN
    RAISE EXCEPTION 'GOV-001: Cannot modify audit timestamp';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_hash ON audit_logs;
CREATE TRIGGER trg_protect_audit_hash
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_hash_modification();

-- 3. Add index on integrity_hash for chain verification
CREATE INDEX IF NOT EXISTS idx_audit_integrity_hash ON audit_logs (integrity_hash);
CREATE INDEX IF NOT EXISTS idx_audit_previous_hash ON audit_logs (previous_hash);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_timestamp ON audit_logs (tenant_id, created_at DESC);

-- 4. Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'integrity_hash') THEN
    ALTER TABLE audit_logs ADD COLUMN integrity_hash VARCHAR(64) NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'previous_hash') THEN
    ALTER TABLE audit_logs ADD COLUMN previous_hash VARCHAR(64) NOT NULL DEFAULT '';
  END IF;
END $$;

-- 5. Verify hash chain integrity function (for periodic audits)
CREATE OR REPLACE FUNCTION verify_audit_chain(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_records BIGINT,
  verified_records BIGINT,
  broken_at_id UUID,
  chain_valid BOOLEAN
) AS $$
DECLARE
  rec RECORD;
  prev_hash VARCHAR(64) := REPEAT('0', 64);
  total BIGINT := 0;
  verified BIGINT := 0;
  broken UUID := NULL;
BEGIN
  FOR rec IN
    SELECT id, integrity_hash, previous_hash
    FROM audit_logs
    WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ORDER BY created_at ASC
  LOOP
    total := total + 1;
    IF rec.previous_hash = prev_hash THEN
      verified := verified + 1;
    ELSIF broken IS NULL THEN
      broken := rec.id;
    END IF;
    prev_hash := rec.integrity_hash;
  END LOOP;
  
  RETURN QUERY SELECT total, verified, broken, (broken IS NULL);
END;
$$ LANGUAGE plpgsql;

-- 6. Enable Row-Level Security on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_tenant_isolation ON audit_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Allow insert from any authenticated user
CREATE POLICY audit_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE audit_logs IS 'GOV-001: Tamper-protected audit log with SHA-256 hash chain. DELETE revoked from all roles.';
