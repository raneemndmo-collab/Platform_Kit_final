// Rasid v6.4 — Shared Connection Factory — A4 Fix
// Reduce 54 isolated pools to domain-grouped pools
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export type ConnectionDomain = 'kernel' | 'intelligence' | 'presentation' | 'enterprise';

const DOMAIN_CONFIGS: Record<ConnectionDomain, { maxPool: number; schemas: string[] }> = {
  kernel: { maxPool: 5, schemas: ['k1_auth', 'k2_authz', 'k3_audit', 'k4_config', 'k5_events', 'k6_tenant', 'k7_feature', 'k8_governance'] },
  intelligence: { maxPool: 8, schemas: ['data_intelligence', 'spreadsheet', 'bi_cognitive', 'arabic_ai', 'performance', 'apil'] },
  presentation: { maxPool: 4, schemas: ['infographic', 'data_safety', 'cdr', 'layout', 'visual_semantic', 'rendering'] },
  enterprise: { maxPool: 5, schemas: ['project', 'document', 'workflow', 'compliance', 'billing', 'tenant_mgmt'] },
};

/**
 * A4 FIX: Creates shared TypeORM connection config for a domain
 * Instead of 54 separate pools, we use 4 domain pools
 */
export function createDomainConnection(
  domain: ConnectionDomain,
  schema?: string,
): Partial<TypeOrmModuleOptions> {
  const config = DOMAIN_CONFIGS[domain];
  return {
    name: `${domain}_pool`,
    type: 'postgres',
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    username: process.env['DB_USER'] || 'rasid',
    password: process.env['DB_PASSWORD'] || '',
    database: process.env['DB_NAME'] || 'rasid_platform',
    schema: schema || domain,
    synchronize: false,
    logging: process.env['DB_LOGGING'] === 'true',
    extra: {
      max: config.maxPool,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  };
}

/**
 * Get the domain for a given module name
 */
export function getDomainForModule(moduleName: string): ConnectionDomain {
  for (const [domain, config] of Object.entries(DOMAIN_CONFIGS)) {
    if (config.schemas.some(s => moduleName.toLowerCase().includes(s.replace('_', '')))) {
      return domain as ConnectionDomain;
    }
  }
  return 'enterprise'; // Default domain
}

/**
 * PgBouncer configuration helper
 */
export function getPgBouncerConfig(): Record<string, any> {
  return {
    pool_mode: 'transaction',
    max_client_conn: 200,
    default_pool_size: 5,
    min_pool_size: 2,
    reserve_pool_size: 3,
    reserve_pool_timeout: 5,
    server_lifetime: 3600,
    server_idle_timeout: 600,
    server_connect_timeout: 15,
    client_idle_timeout: 0,
    stats_period: 60,
  };
}
