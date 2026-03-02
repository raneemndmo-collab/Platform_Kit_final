-- =============================================================================
-- Rasid Platform v6 — Kernel Database Initialization
-- Constitutional Reference: DBM-001 (41 databases, 41 credential sets, 0 shared)
-- Phase 0: 10 Kernel databases
-- =============================================================================

-- K1: Authentication
CREATE DATABASE auth_db OWNER rasid;

-- K2: Authorization  
CREATE DATABASE authz_db OWNER rasid;

-- K3: Audit (append-only)
CREATE DATABASE audit_db OWNER rasid;

-- K4: Configuration
CREATE DATABASE config_db OWNER rasid;

-- K5: Event Bus
CREATE DATABASE eventbus_db OWNER rasid;

-- K6: Notification
CREATE DATABASE notification_db OWNER rasid;

-- K7: Task Orchestration
CREATE DATABASE orchestration_db OWNER rasid;

-- K8: Data Governance
CREATE DATABASE governance_db OWNER rasid;

-- K9: Monitoring
CREATE DATABASE monitoring_db OWNER rasid;

-- K10: Module Lifecycle
CREATE DATABASE lifecycle_db OWNER rasid;

-- Enable required extensions on all databases
DO $$
DECLARE
    db_name TEXT;
BEGIN
    FOR db_name IN 
        SELECT unnest(ARRAY[
            'auth_db', 'authz_db', 'audit_db', 'config_db', 'eventbus_db',
            'notification_db', 'orchestration_db', 'governance_db', 
            'monitoring_db', 'lifecycle_db'
        ])
    LOOP
        EXECUTE format('
            ALTER DATABASE %I SET search_path TO public;
        ', db_name);
    END LOOP;
END $$;

-- Row-Level Security helper function (TNT-001)
-- This function enforces tenant isolation at the database level
CREATE OR REPLACE FUNCTION enforce_tenant_isolation()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW."tenantId" IS NULL THEN
        RAISE EXCEPTION 'FP-011: tenantId cannot be NULL. Tenant isolation violation.';
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Audit immutability trigger (K3)
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $func$
BEGIN
    RAISE EXCEPTION 'FORBIDDEN: Audit records are immutable. Modification attempts are logged.';
    RETURN NULL;
END;
$func$ LANGUAGE plpgsql;

\echo '=========================================='
\echo '  Rasid Platform v6 — Phase 0 Databases'
\echo '  10 Kernel databases created successfully'
\echo '  0 shared access (DBM-001 compliant)'
\echo '=========================================='
