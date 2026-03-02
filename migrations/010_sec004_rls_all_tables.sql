-- =============================================================================
-- SEC-004: Row-Level Security for ALL Kernel & Module Tables
-- Ensures tenant data isolation at the database level
-- =============================================================================

-- Helper function to set tenant context (called by TenantRLS subscriber)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- Generic RLS policy creator
CREATE OR REPLACE FUNCTION create_tenant_rls(p_table TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);
  
  -- Drop existing policies
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'tenant_isolation_' || p_table, p_table);
  
  -- Create isolation policy
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR ALL USING (tenant_id::text = current_setting(''app.current_tenant'', true))',
    'tenant_isolation_' || p_table, p_table
  );
  
  RAISE NOTICE 'SEC-004: RLS enabled for table %', p_table;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all kernel tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    -- K1 Auth
    'users', 'sessions', 'api_keys',
    -- K2 Authz
    'roles', 'permissions', 'user_roles', 'policies',
    -- K3 Audit
    'audit_logs',
    -- K4 Config
    'config_entries', 'config_history',
    -- K5 Event Bus
    'events', 'event_subscriptions', 'dead_letter_events',
    -- K6 Notification
    'notifications', 'notification_templates',
    -- K7 Orchestration
    'tasks', 'task_assignments', 'workflows',
    -- K8 Governance
    'data_classifications', 'retention_policies',
    -- K9 Monitoring
    'health_checks', 'metrics_snapshots',
    -- K10 Lifecycle
    'module_registrations', 'module_health'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      PERFORM create_tenant_rls(t);
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist yet, skipping RLS', t;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error enabling RLS on %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Bypass policy for system operations (migrations, health checks)
CREATE ROLE IF NOT EXISTS rasid_system;
ALTER ROLE rasid_system SET app.current_tenant = '';

-- Grant bypass to system role for administrative tasks
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['users', 'sessions', 'roles', 'permissions', 'audit_logs', 'config_entries'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS system_bypass_%I ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY system_bypass_%I ON %I FOR ALL TO rasid_system USING (true)',
        t, t
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip bypass policy for %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION set_tenant_context IS 'SEC-004: Sets tenant context for RLS. Must be called at start of each request.';
COMMENT ON FUNCTION create_tenant_rls IS 'SEC-004: Enables tenant-level RLS on any table with tenant_id column.';
