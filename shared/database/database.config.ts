// =============================================================================
// Rasid Platform v6.2 — Database-Per-Module Configuration Factory
// Constitutional Reference: P-003 (Data Sovereignty), DBM-001
// Each module SHALL own its database exclusively.
// Cross-module database access is FORBIDDEN.
// =============================================================================

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface ModuleDatabaseConfig {
  moduleId: string;
  databaseName: string;
  username: string;
  entities: Function[];
  tier?: 1 | 2; // Tier 1 = physically isolated, Tier 2 = RLS
}

/**
 * Creates a TypeORM connection configuration for a specific module.
 * Each module gets its own named connection with dedicated credentials.
 * FORBIDDEN: Sharing connections across modules (P-003, FP-011)
 */
export function createModuleDatabaseConfig(config: ModuleDatabaseConfig): TypeOrmModuleOptions {
  const envPrefix = config.moduleId.toUpperCase().replace('-', '_');

  return {
    type: 'postgres',
    name: `${config.moduleId}_connection`,
    host: process.env[`${envPrefix}_DB_HOST`] || process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env[`${envPrefix}_DB_PORT`] || process.env['DB_PORT'] || '5432', 10),
    username: process.env[`${envPrefix}_DB_USERNAME`] || config.username,
    password: process.env[`${envPrefix}_DB_PASSWORD`] || `${config.username}_secure_pwd`,
    database: process.env[`${envPrefix}_DB_DATABASE`] || config.databaseName,
    entities: config.entities,
    synchronize: process.env['NODE_ENV'] !== 'production',
    logging: process.env['DB_LOGGING'] === 'true',
    ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    extra: {
      // ARC-001 FIX: Reduced pool sizes to prevent exceeding PostgreSQL max_connections=100
      // 62 modules × avg 3 connections = ~186 — requires PgBouncer for production
      max: config.tier === 1 ? 5 : 3,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };
}

// ==========================================
// Module Database Registry (Constitutional)
// ==========================================
export const MODULE_DB_REGISTRY: Record<string, { db: string; user: string; tier: 1 | 2 }> = {
  // Kernel (Phase 0)
  K1: { db: 'auth_db', user: 'auth_user', tier: 1 },
  K2: { db: 'authz_db', user: 'authz_user', tier: 1 },
  K3: { db: 'audit_db', user: 'audit_user', tier: 1 },
  K4: { db: 'config_db', user: 'config_user', tier: 2 },
  K5: { db: 'eventbus_db', user: 'eventbus_user', tier: 2 },
  K6: { db: 'notification_db', user: 'notification_user', tier: 2 },
  K7: { db: 'orchestration_db', user: 'orchestration_user', tier: 2 },
  K8: { db: 'governance_db', user: 'governance_user', tier: 2 },
  K9: { db: 'monitoring_db', user: 'monitoring_user', tier: 2 },
  K10: { db: 'lifecycle_db', user: 'lifecycle_user', tier: 2 },
  // Phase 1
  M1: { db: 'hrm_db', user: 'hrm_user', tier: 2 },
  M2: { db: 'finance_db', user: 'finance_user', tier: 1 },
  M3: { db: 'crm_db', user: 'crm_user', tier: 2 },
  M4: { db: 'inventory_db', user: 'inventory_user', tier: 2 },
  M5: { db: 'procurement_db', user: 'procurement_user', tier: 2 },
  M30: { db: 'gateway_db', user: 'gateway_user', tier: 2 },
  // Phase 2
  M6: { db: 'project_db', user: 'project_user', tier: 2 },
  M7: { db: 'document_db', user: 'document_user', tier: 2 },
  M8: { db: 'workflow_db', user: 'workflow_user', tier: 2 },
  M9: { db: 'compliance_db', user: 'compliance_user', tier: 2 },
  M10: { db: 'legal_db', user: 'legal_user', tier: 2 },
  M25: { db: 'filestorage_db', user: 'filestorage_user', tier: 2 },
  M26: { db: 'scheduler_db', user: 'scheduler_user', tier: 2 },
  // Phase 3
  M11: { db: 'ai_db', user: 'ai_user', tier: 2 },
  M12: { db: 'analytics_db', user: 'analytics_user', tier: 2 },
  M13: { db: 'reporting_db', user: 'reporting_user', tier: 2 },
  M14: { db: 'decision_db', user: 'decision_user', tier: 2 },
  M15: { db: 'knowledge_db', user: 'knowledge_user', tier: 2 },
  M16: { db: 'nlp_db', user: 'nlp_user', tier: 2 },
  M17: { db: 'vision_db', user: 'vision_user', tier: 2 },
  // Phase 4
  M18: { db: 'dashboard_db', user: 'dashboard_user', tier: 2 },
  M19: { db: 'portal_db', user: 'portal_user', tier: 2 },
  M20: { db: 'notifcenter_db', user: 'notifcenter_user', tier: 2 },
  M21: { db: 'search_db', user: 'search_user', tier: 2 },
  M22: { db: 'personalization_db', user: 'personalization_user', tier: 2 },
  M23: { db: 'collaboration_db', user: 'collaboration_user', tier: 2 },
  M24: { db: 'integration_db', user: 'integration_user', tier: 2 },
  // Phase 5
  M27: { db: 'audittrail_db', user: 'audittrail_user', tier: 1 },
  M28: { db: 'tenant_db', user: 'tenant_user', tier: 1 },
  M29: { db: 'billing_db', user: 'billing_user', tier: 1 },
  M31: { db: 'devportal_db', user: 'devportal_user', tier: 2 },
  // Tier X (Phase 6-7)
  D1: { db: 'cdr_db', user: 'cdr_user', tier: 1 },
  D2: { db: 'layout_db', user: 'layout_user', tier: 2 },
  D3: { db: 'vsm_db', user: 'vsm_user', tier: 2 },
  D4: { db: 'conversion_db', user: 'conversion_user', tier: 2 },
  D5: { db: 'render_db', user: 'render_user', tier: 2 },
  D6: { db: 'media_db', user: 'media_user', tier: 2 },
  D7: { db: 'interaction_db', user: 'interaction_user', tier: 2 },
  D8: { db: 'typography_db', user: 'typography_user', tier: 2 },
  D9: { db: 'brand_db', user: 'brand_user', tier: 2 },
  D10: { db: 'translation_db', user: 'translation_user', tier: 2 },
  D11: { db: 'constraint_db', user: 'constraint_user', tier: 2 },
  D12: { db: 'rebinding_db', user: 'rebinding_user', tier: 2 },
  D13: { db: 'vdrift_db', user: 'vdrift_user', tier: 2 },
};

// v6.4 Enhanced Module Database Configurations
export const V64_DATABASE_REGISTRY: Record<string, { database: string; username: string; tier: number }> = {
  apil_orchestrator: { database: 'apil_orchestrator_db', username: 'apil_user', tier: 2 },
  arabic_ai_engine: { database: 'arabic_ai_engine_db', username: 'arabic_ai_user', tier: 2 },
  bi_cognitive: { database: 'bi_cognitive_db', username: 'bi_cognitive_user', tier: 2 },
  data_intelligence: { database: 'data_intelligence_db', username: 'data_intelligence_user', tier: 2 },
  data_safety: { database: 'data_safety_db', username: 'data_safety_user', tier: 2 },
  infographic_engine: { database: 'infographic_engine_db', username: 'infographic_user', tier: 2 },
  performance_intelligence: { database: 'performance_intelligence_db', username: 'performance_user', tier: 2 },
  spreadsheet_intelligence: { database: 'spreadsheet_intelligence_db', username: 'spreadsheet_user', tier: 2 },
};
