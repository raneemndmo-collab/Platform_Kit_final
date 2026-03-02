-- =============================================================================
-- Rasid Platform v6 — Phase 1: Business Module Database Initialization
-- Constitutional Reference: DBM-001 (6 databases, 6 credentials, 0 shared)
-- =============================================================================

-- M30: API Gateway
CREATE DATABASE gateway_db OWNER rasid;
CREATE USER gateway_user WITH PASSWORD 'gateway_secure_pwd';
GRANT ALL PRIVILEGES ON DATABASE gateway_db TO gateway_user;

-- M1: HRM
CREATE DATABASE hrm_db OWNER rasid;
CREATE USER hrm_user WITH PASSWORD 'hrm_secure_pwd';
GRANT ALL PRIVILEGES ON DATABASE hrm_db TO hrm_user;

-- M2: Finance (Tier 1 — physically isolated in production)
CREATE DATABASE finance_db OWNER rasid;
CREATE USER finance_user WITH PASSWORD 'finance_secure_pwd';
GRANT ALL PRIVILEGES ON DATABASE finance_db TO finance_user;

-- M3: CRM
CREATE DATABASE crm_db OWNER rasid;
CREATE USER crm_user WITH PASSWORD 'crm_secure_pwd';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;

-- M4: Inventory
CREATE DATABASE inventory_db OWNER rasid;
CREATE USER inventory_user WITH PASSWORD 'inventory_secure_pwd';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;

-- M5: Procurement
CREATE DATABASE procurement_db OWNER rasid;
CREATE USER procurement_user WITH PASSWORD 'procurement_secure_pwd';
GRANT ALL PRIVILEGES ON DATABASE procurement_db TO procurement_user;

-- Apply tenant isolation triggers to each business DB
DO $$
DECLARE
  db_name TEXT;
BEGIN
  FOR db_name IN SELECT unnest(ARRAY[
    'gateway_db','hrm_db','finance_db','crm_db','inventory_db','procurement_db'
  ]) LOOP
    EXECUTE format('
      \c %I
      CREATE OR REPLACE FUNCTION enforce_tenant_isolation()
      RETURNS TRIGGER AS $t$
      BEGIN
        IF NEW."tenantId" IS NULL THEN
          RAISE EXCEPTION ''FP-011: tenantId is required (TNT-001)'';
        END IF;
        RETURN NEW;
      END;
      $t$ LANGUAGE plpgsql;
    ', db_name);
  END LOOP;
END $$;
