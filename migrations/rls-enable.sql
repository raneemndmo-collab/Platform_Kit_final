-- Rasid v6.4 — Row-Level Security — SEC-004 Fix
-- Apply to ALL 38 tenant-scoped databases
-- This is a TEMPLATE — generate per-entity in production

-- Step 1: Enable RLS on all tenant tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('migrations', 'typeorm_metadata')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl.tablename);
    
    -- Create tenant isolation policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%I ON %I 
       USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)
       WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)',
      tbl.tablename, tbl.tablename
    );
    
    RAISE NOTICE 'RLS enabled on table: %', tbl.tablename;
  END LOOP;
END $$;

-- Step 2: Create app role that respects RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rasid_app') THEN
    CREATE ROLE rasid_app LOGIN;
  END IF;
END $$;

-- Grant access through RLS-protected paths only
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rasid_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO rasid_app;

-- Step 3: Helper function to set tenant context per request
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
