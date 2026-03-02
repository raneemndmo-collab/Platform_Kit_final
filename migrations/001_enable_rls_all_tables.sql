-- =============================================================================
-- SEC-004 FIX: Enable Row Level Security on ALL tenant-scoped tables
-- Run this migration against each kernel/module database
-- =============================================================================

-- Step 1: Enable RLS on all tables with tenant_id column
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl.table_name);
    
    -- Create tenant isolation policy
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS tenant_isolation_%I ON %I 
       USING (tenant_id = current_setting(''app.current_tenant_id'', true))
       WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true))',
      tbl.table_name, tbl.table_name
    );
    
    RAISE NOTICE 'RLS enabled on %', tbl.table_name;
  END LOOP;
END
$$;

-- Step 2: Revoke DELETE on audit tables (GOV-001)
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_name LIKE '%audit%' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('REVOKE DELETE ON %I FROM PUBLIC', tbl.table_name);
    EXECUTE format('REVOKE DELETE ON %I FROM rasid_app_user', tbl.table_name);
    RAISE NOTICE 'DELETE revoked on %', tbl.table_name;
  END LOOP;
END
$$;

-- Step 3: Add integrity hash column for audit (GOV-001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'integrity_hash'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN integrity_hash VARCHAR(64);
    ALTER TABLE audit_logs ADD COLUMN previous_hash VARCHAR(64);
    CREATE INDEX idx_audit_integrity ON audit_logs (integrity_hash);
  END IF;
END
$$;
