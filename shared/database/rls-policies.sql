-- Rasid v6.4 — Row-Level Security Policies — SEC-004 Fix
-- Apply to all tenant-scoped tables

-- Enable RLS on all tenant tables
-- Run for each table: ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Template policy: tenant isolation
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
  SELECT current_setting('app.current_tenant_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- Generic tenant isolation policy template
-- Apply to each table with tenant_id column:
/*
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_<table_name> ON <table_name>
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Admin bypass policy
CREATE POLICY admin_bypass_<table_name> ON <table_name>
  USING (current_setting('app.is_admin', true)::boolean = true);
*/

-- Kernel tables
ALTER TABLE IF EXISTS k1_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS k1_users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_k1_users ON k1_users
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE IF EXISTS k2_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS k2_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_k2_roles ON k2_roles
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE IF EXISTS k3_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS k3_audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_k3_audit ON k3_audit_logs
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE IF EXISTS k5_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS k5_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_k5_events ON k5_events
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Module tables
ALTER TABLE IF EXISTS data_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS spreadsheet_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bi_cognitive ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS infographic_engine ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS data_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS arabic_ai_engine ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS performance_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS apil_orchestrator ENABLE ROW LEVEL SECURITY;

-- Set tenant context before each request (called by middleware)
-- SET app.current_tenant_id = '<tenant-uuid>';
