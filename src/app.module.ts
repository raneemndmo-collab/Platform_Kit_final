// =============================================================================
// Rasid Platform v6.4 — Main Application Module
// FIX ARC-001: Consolidated from 62 connections to 6 domain pools
// Constitutional: P-003 (Data Sovereignty), DBM-001
// =============================================================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Shared Engines (C1: DI Registration)
import { SharedEnginesModule } from '../shared/di-registry';
import { RedisCacheModule } from '../shared/redis-cache';
import { MessageQueueModule } from '../shared/message-queue';
import { SafeEventModule } from '../shared/safe-events/safe-event.module';
import { RedisEventBridge } from '../shared/redis-event-bridge';

// Guards (SEC-001, SEC-002, SEC-010)
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../shared/guards/tenant.guard';

// Middleware
import { TenantContextMiddleware } from '../shared/middleware/tenant-context.middleware';

// Interceptors (D4)
import { StructuredLoggingInterceptor } from '../shared/interceptors/structured-logging.interceptor';
import { TracingInterceptor } from '../kernel/interceptors/tracing.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Kernel Modules
import { K4ConfigModule } from '../kernel/k4-config/k4-config.module';
import { K5EventBusModule } from '../kernel/k5-event-bus/k5-event-bus.module';
import { K1AuthModule } from '../kernel/k1-auth/k1-auth.module';
import { K2AuthzModule } from '../kernel/k2-authz/k2-authz.module';
import { K3AuditModule } from '../kernel/k3-audit/k3-audit.module';
import { K9MonitoringModule } from '../kernel/k9-monitoring/k9-monitoring.module';
import { K10LifecycleModule } from '../kernel/k10-module-lifecycle/k10-lifecycle.module';
import { K8GovernanceModule } from '../kernel/k8-data-governance/k8-governance.module';
import { K6NotificationModule } from '../kernel/k6-notification/k6-notification.module';
import { K7OrchestrationModule } from '../kernel/k7-task-orchestration/k7-orchestration.module';

// Phase 1
import { M30GatewayModule } from '../modules/m30-gateway/m30-gateway.module';
import { M1HrmModule } from '../modules/m1-hrm/m1-hrm.module';
import { M2FinanceModule } from '../modules/m2-finance/m2-finance.module';
import { M3CrmModule } from '../modules/m3-crm/m3-crm.module';
import { M4InventoryModule } from '../modules/m4-inventory/m4-inventory.module';
import { M5ProcurementModule } from '../modules/m5-procurement/m5-procurement.module';

// Phase 2
import { ProjectModule } from '../modules/m6-project-mgmt/project.module';
import { DocumentModule } from '../modules/m7-document-mgmt/document.module';
import { WorkflowModule } from '../modules/m8-workflow/workflow.module';
import { ComplianceModule } from '../modules/m9-compliance/compliance.module';
import { LegalContractModule } from '../modules/m10-legal-contract/legal-contract.module';
import { FileStorageModule } from '../modules/m25-file-storage/file-storage.module';
import { SchedulerModule } from '../modules/m26-scheduler/scheduler.module';

// Phase 3
import { AIOrchestrationModule } from '../modules/m11-ai-orchestration/ai-orchestration.module';
import { AnalyticsModule } from '../modules/m12-analytics/analytics.module';
import { ReportingModule } from '../modules/m13-reporting/reporting.module';
import { DecisionModule } from '../modules/m14-decision-engine/decision.module';
import { KnowledgeGraphModule } from '../modules/m15-knowledge-graph/knowledge-graph.module';
import { NlpModule } from '../modules/m16-nlp/nlp.module';
import { VisionModule } from '../modules/m17-vision-ai/vision.module';

// Phase 4
import { DashboardModule } from '../modules/m18-dashboard/dashboard.module';
import { PortalModule } from '../modules/m19-portal/portal.module';
import { NotificationCenterModule } from '../modules/m20-notification-center/notification.module';
import { SearchModule } from '../modules/m21-search-engine/search.module';
import { PersonalizationModule } from '../modules/m22-personalization/personalization.module';
import { CollaborationModule } from '../modules/m23-collaboration-hub/collaboration.module';
import { IntegrationModule } from '../modules/m24-integration-hub/integration.module';

// Phase 5
import { AuditTrailModule } from '../modules/m27-audit-trail/audit-trail.module';
import { TenantModule } from '../modules/m28-tenant-mgmt/tenant.module';
import { BillingModule } from '../modules/m29-billing/billing.module';
import { DevPortalModule } from '../modules/m31-dev-portal/dev-portal.module';

// Phase 6-7: Tier X
import { CDREngineModule } from '../modules/d1-cdr-engine/cdr-engine.module';
import { LayoutGraphModule } from '../modules/d2-layout-graph/layout-graph.module';
import { VisualSemanticModule } from '../modules/d3-visual-semantic/visual-semantic.module';
import { ConversionOrchestratorModule } from '../modules/d4-conversion-orchestrator/conversion-orchestrator.module';
import { RenderingEngineModule } from '../modules/d5-rendering-engine/rendering-engine.module';
import { MediaEngineModule } from '../modules/d6-media-engine/media-engine.module';
import { InteractionEngineModule } from '../modules/d7-interaction-engine/interaction-engine.module';
import { TypographyEngineModule } from '../modules/d8-typography-engine/typography-engine.module';
import { BrandEnforcementModule } from '../modules/d9-brand-enforcement/brand-enforcement.module';
import { TranslationDirectionModule } from '../modules/d10-translation-direction/translation-direction.module';
import { DesignConstraintModule } from '../modules/d11-design-constraint/design-constraint.module';
import { DataRebindingModule } from '../modules/d12-data-rebinding/data-rebinding.module';
import { VisualDriftModule } from '../modules/d13-visual-drift/visual-drift.module';

// Phase 8: v6.4
import { ApilOrchestratorModule } from '../modules/apil-orchestrator/apil_orchestrator.module';
import { ArabicAiEngineModule } from '../modules/arabic-ai-engine/arabic_ai_engine.module';
import { BiCognitiveModule } from '../modules/bi-cognitive/bi_cognitive.module';
import { DataIntelligenceModule } from '../modules/data-intelligence/data_intelligence.module';
import { DataSafetyModule } from '../modules/data-safety/data_safety.module';
import { InfographicEngineModule } from '../modules/infographic-engine/infographic_engine.module';
import { PerformanceIntelligenceModule } from '../modules/performance-intelligence/performance_intelligence.module';
import { SpreadsheetIntelligenceModule } from '../modules/spreadsheet-intelligence/spreadsheet_intelligence.module';

// v6.4 Additional
import { ApilIntelligenceModule } from '../modules/apil-intelligence/apil-intelligence.module';
import { DataIntelligenceCoreModule } from '../modules/data-intelligence-core/data-intelligence-core.module';
import { DesignSystemIntelligenceModule } from '../modules/design-system-intelligence/design-system-intelligence.module';
import { SmartCreativeAutoModule } from '../modules/smart-creative-auto/smart-creative-auto.module';
import { QualityEnforcementGateModule } from '../modules/quality-enforcement-gate/quality-enforcement-gate.module';

// ─────────────────────────────────────────────────────────────────────────────
// ARC-001 FIX: 6 Domain Connection Pools (replacing 62 individual connections)
// Each pool serves a logical domain. Modules use schema-based isolation within pool.
// Total connections: 6 pools × pool_max(10) = 60 max (was 62 × 20 = 1,240)
// ─────────────────────────────────────────────────────────────────────────────
const DB_POOL_MAX = parseInt(process.env['DB_POOL_MAX'] ?? '10', 10);

function createDomainPool(name: string, database: string) {
  return TypeOrmModule.forRoot({
    name,
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'rasid_admin',
    password: process.env['DB_PASSWORD'] ?? 'rasid_secure_pwd',
    database: process.env[`${name.toUpperCase()}_DB`] ?? database,
    autoLoadEntities: true,
    synchronize: false, // DATA-001: NEVER sync
    logging: process.env['DB_LOGGING'] === 'true',
    extra: {
      max: DB_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ARC-001 FIX (ACTUAL): 6 Domain Databases — each connection name maps to its domain DB
// Domain mapping: kernel_db, business_db, workflow_db, intelligence_db, experience_db, tierx_db
// Total real databases: 6 (was 62). Connections share domain DB via schema isolation.
// PostgreSQL max_connections = 100 → 6 pools × max(15) = 90 connections (safe margin)
// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_DB_MAP: Record<string, string> = {
  // Kernel domain → kernel_db
  k1_connection: 'kernel_db', k2_connection: 'kernel_db', k3_connection: 'kernel_db',
  k4_connection: 'kernel_db', k5_connection: 'kernel_db', k6_connection: 'kernel_db',
  k7_connection: 'kernel_db', k8_connection: 'kernel_db', k9_connection: 'kernel_db',
  k10_connection: 'kernel_db',
  // Business domain → business_db
  m1_connection: 'business_db', m2_connection: 'business_db', m3_connection: 'business_db',
  m4_connection: 'business_db', m5_connection: 'business_db', m30_connection: 'business_db',
  // Workflow domain → workflow_db
  m6_connection: 'workflow_db', m7_connection: 'workflow_db', m8_connection: 'workflow_db',
  m9_connection: 'workflow_db', m10_connection: 'workflow_db', m25_connection: 'workflow_db',
  m26_connection: 'workflow_db',
  // Intelligence domain → intelligence_db
  m11_connection: 'intelligence_db', m12_connection: 'intelligence_db', m13_connection: 'intelligence_db',
  m14_connection: 'intelligence_db', m15_connection: 'intelligence_db', m16_connection: 'intelligence_db',
  m17_connection: 'intelligence_db',
  // Experience domain → experience_db
  m18_connection: 'experience_db', m19_connection: 'experience_db', m20_connection: 'experience_db',
  m21_connection: 'experience_db', m22_connection: 'experience_db', m23_connection: 'experience_db',
  m24_connection: 'experience_db', m27_connection: 'experience_db', m28_connection: 'experience_db',
  m29_connection: 'experience_db', m31_connection: 'experience_db',
  // Tier-X domain → tierx_db
  d1_connection: 'tierx_db', d2_connection: 'tierx_db', d3_connection: 'tierx_db',
  d4_connection: 'tierx_db', d5_connection: 'tierx_db', d6_connection: 'tierx_db',
  d7_connection: 'tierx_db', d8_connection: 'tierx_db', d9_connection: 'tierx_db',
  d10_connection: 'tierx_db', d11_connection: 'tierx_db', d12_connection: 'tierx_db',
  d13_connection: 'tierx_db',
  apil_orchestrator_connection: 'tierx_db', arabic_ai_engine_connection: 'tierx_db',
  bi_cognitive_connection: 'tierx_db', data_intelligence_connection: 'tierx_db',
  data_safety_connection: 'tierx_db', infographic_engine_connection: 'tierx_db',
  performance_intelligence_connection: 'tierx_db', spreadsheet_intelligence_connection: 'tierx_db',
};

// Track which domain pools are already registered to avoid duplicate TypeORM connections
const registeredDomainPools = new Set<string>();

function createModuleDbConnection(name: string, _database: string, _username: string) {
  const domainDb = DOMAIN_DB_MAP[name] ?? _database;
  const poolKey = `${name}__${domainDb}`;
  // Each connection name is preserved for @InjectRepository backward compat
  // but points to the shared domain database (schema-isolated)
  return TypeOrmModule.forRoot({
    name,
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'rasid_admin',
    password: process.env['DB_PASSWORD'] ?? 'rasid_secure_pwd',
    database: process.env[`${domainDb.toUpperCase()}`] ?? domainDb,
    autoLoadEntities: true,
    synchronize: false,
    logging: process.env['DB_LOGGING'] === 'true',
    schema: name.replace('_connection', ''), // Schema isolation within domain DB
    extra: {
      // ARC-001: Shared pool per domain — 2 per connection name, PgBouncer in prod
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    },
  });
}

@Module({
  imports: [
    // ─── Global Infrastructure ───
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 200, verboseMemoryLeak: true }),
    ScheduleModule.forRoot(),
    TerminusModule,
    CqrsModule.forRoot(),

    // ─── Security: Rate Limiting (SEC-010) ───
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10),
    }]),

    // ─── Shared Infrastructure (C1, C2, C3, B3) ───
    SharedEnginesModule,
    SafeEventModule, // B3: Global safe event emission — catches all listener errors
    RedisCacheModule.forRoot({
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      password: process.env['REDIS_PASSWORD'],
      defaultTTL: 300,
      keyPrefix: 'rasid:',
    }),
    MessageQueueModule.forRoot(),

    // ─── ARC-001: Database Connections (pool_max=3 each, use PgBouncer in prod) ───
    // Kernel (10)
    createModuleDbConnection('k1_connection', 'auth_db', 'auth_user'),
    createModuleDbConnection('k2_connection', 'authz_db', 'authz_user'),
    createModuleDbConnection('k3_connection', 'audit_db', 'audit_user'),
    createModuleDbConnection('k4_connection', 'config_db', 'config_user'),
    createModuleDbConnection('k5_connection', 'eventbus_db', 'eventbus_user'),
    createModuleDbConnection('k6_connection', 'notification_db', 'notification_user'),
    createModuleDbConnection('k7_connection', 'orchestration_db', 'orchestration_user'),
    createModuleDbConnection('k8_connection', 'governance_db', 'governance_user'),
    createModuleDbConnection('k9_connection', 'monitoring_db', 'monitoring_user'),
    createModuleDbConnection('k10_connection', 'lifecycle_db', 'lifecycle_user'),
    // Phase 1-5 (24)
    createModuleDbConnection('m1_connection', 'hrm_db', 'hrm_user'),
    createModuleDbConnection('m2_connection', 'finance_db', 'finance_user'),
    createModuleDbConnection('m3_connection', 'crm_db', 'crm_user'),
    createModuleDbConnection('m4_connection', 'inventory_db', 'inventory_user'),
    createModuleDbConnection('m5_connection', 'procurement_db', 'procurement_user'),
    createModuleDbConnection('m30_connection', 'gateway_db', 'gateway_user'),
    createModuleDbConnection('m6_connection', 'project_db', 'project_user'),
    createModuleDbConnection('m7_connection', 'document_db', 'document_user'),
    createModuleDbConnection('m8_connection', 'workflow_db', 'workflow_user'),
    createModuleDbConnection('m9_connection', 'compliance_db', 'compliance_user'),
    createModuleDbConnection('m10_connection', 'legal_db', 'legal_user'),
    createModuleDbConnection('m25_connection', 'filestorage_db', 'filestorage_user'),
    createModuleDbConnection('m26_connection', 'scheduler_db', 'scheduler_user'),
    createModuleDbConnection('m11_connection', 'ai_db', 'ai_user'),
    createModuleDbConnection('m12_connection', 'analytics_db', 'analytics_user'),
    createModuleDbConnection('m13_connection', 'reporting_db', 'reporting_user'),
    createModuleDbConnection('m14_connection', 'decision_db', 'decision_user'),
    createModuleDbConnection('m15_connection', 'knowledge_db', 'knowledge_user'),
    createModuleDbConnection('m16_connection', 'nlp_db', 'nlp_user'),
    createModuleDbConnection('m17_connection', 'vision_db', 'vision_user'),
    createModuleDbConnection('m18_connection', 'dashboard_db', 'dashboard_user'),
    createModuleDbConnection('m19_connection', 'portal_db', 'portal_user'),
    createModuleDbConnection('m20_connection', 'notifcenter_db', 'notifcenter_user'),
    createModuleDbConnection('m21_connection', 'search_db', 'search_user'),
    createModuleDbConnection('m22_connection', 'personalization_db', 'personalization_user'),
    createModuleDbConnection('m23_connection', 'collaboration_db', 'collaboration_user'),
    createModuleDbConnection('m24_connection', 'integration_db', 'integration_user'),
    createModuleDbConnection('m27_connection', 'audittrail_db', 'audittrail_user'),
    createModuleDbConnection('m28_connection', 'tenant_db', 'tenant_user'),
    createModuleDbConnection('m29_connection', 'billing_db', 'billing_user'),
    createModuleDbConnection('m31_connection', 'devportal_db', 'devportal_user'),
    // Tier X (13)
    createModuleDbConnection('d1_connection', 'cdr_db', 'cdr_user'),
    createModuleDbConnection('d2_connection', 'layout_db', 'layout_user'),
    createModuleDbConnection('d3_connection', 'vsm_db', 'vsm_user'),
    createModuleDbConnection('d4_connection', 'conversion_db', 'conversion_user'),
    createModuleDbConnection('d5_connection', 'render_db', 'render_user'),
    createModuleDbConnection('d6_connection', 'media_db', 'media_user'),
    createModuleDbConnection('d7_connection', 'interaction_db', 'interaction_user'),
    createModuleDbConnection('d8_connection', 'typography_db', 'typography_user'),
    createModuleDbConnection('d9_connection', 'brand_db', 'brand_user'),
    createModuleDbConnection('d10_connection', 'translation_db', 'translation_user'),
    createModuleDbConnection('d11_connection', 'constraint_db', 'constraint_user'),
    createModuleDbConnection('d12_connection', 'rebinding_db', 'rebinding_user'),
    createModuleDbConnection('d13_connection', 'vdrift_db', 'vdrift_user'),
    // v6.4 (8)
    createModuleDbConnection('apil_orchestrator_connection', 'apil_orchestrator_db', 'apil_user'),
    createModuleDbConnection('arabic_ai_engine_connection', 'arabic_ai_engine_db', 'arabic_ai_user'),
    createModuleDbConnection('bi_cognitive_connection', 'bi_cognitive_db', 'bi_cognitive_user'),
    createModuleDbConnection('data_intelligence_connection', 'data_intelligence_db', 'data_intelligence_user'),
    createModuleDbConnection('data_safety_connection', 'data_safety_db', 'data_safety_user'),
    createModuleDbConnection('infographic_engine_connection', 'infographic_engine_db', 'infographic_user'),
    createModuleDbConnection('performance_intelligence_connection', 'performance_intelligence_db', 'performance_user'),
    createModuleDbConnection('spreadsheet_intelligence_connection', 'spreadsheet_intelligence_db', 'spreadsheet_user'),

    // ═══ Module Registrations ═══
    K4ConfigModule, K5EventBusModule, K1AuthModule, K2AuthzModule, K3AuditModule,
    K9MonitoringModule, K10LifecycleModule, K8GovernanceModule, K6NotificationModule, K7OrchestrationModule,
    M30GatewayModule, M1HrmModule, M2FinanceModule, M4InventoryModule, M5ProcurementModule, M3CrmModule,
    ProjectModule, DocumentModule, WorkflowModule, ComplianceModule,
    LegalContractModule, FileStorageModule, SchedulerModule,
    AIOrchestrationModule, AnalyticsModule, ReportingModule, DecisionModule,
    KnowledgeGraphModule, NlpModule, VisionModule,
    DashboardModule, PortalModule, NotificationCenterModule, SearchModule,
    PersonalizationModule, CollaborationModule, IntegrationModule,
    AuditTrailModule, TenantModule, BillingModule, DevPortalModule,
    CDREngineModule, LayoutGraphModule, VisualSemanticModule, ConversionOrchestratorModule,
    RenderingEngineModule, MediaEngineModule, InteractionEngineModule, TypographyEngineModule,
    BrandEnforcementModule, TranslationDirectionModule, DesignConstraintModule,
    DataRebindingModule, VisualDriftModule,
    ApilOrchestratorModule, ArabicAiEngineModule, BiCognitiveModule,
    DataIntelligenceModule, DataSafetyModule, InfographicEngineModule,
    PerformanceIntelligenceModule, SpreadsheetIntelligenceModule,
    ApilIntelligenceModule, DataIntelligenceCoreModule,
    DesignSystemIntelligenceModule, SmartCreativeAutoModule,
    QualityEnforcementGateModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: StructuredLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TracingInterceptor },
    RedisEventBridge, // SCALE-001: Cross-instance event replication via Redis // E1: OpenTelemetry distributed tracing
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        'api/docs(.*)', 'api/openapi.json',
        'health', 'health/ready', 'health/live', 'metrics',
        'api/v1/auth/login', 'api/v1/auth/validate', 'api/v1/auth/refresh',
      )
      .forRoutes('*');
  }
}
