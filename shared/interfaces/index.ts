// =============================================================================
// Rasid Platform v6 — Core Shared Interfaces
// Constitutional Reference: P-001 (Modularity), P-002 (Contract Sovereignty)
// =============================================================================

// --- Tenant Context (TNT-001) ---
export interface TenantContext {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly subscriptionTier: string;
  readonly resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  maxUsers: number;
  maxStorage: number;
  maxApiCalls: number;
}

// --- Module Manifest (P-014, DCD-001) ---
export interface ModuleManifest {
  moduleId: string;
  moduleName: string;
  version: string;
  tier: 'kernel' | 'business' | 'intelligence' | 'experience' | 'platform' | 'document';
  ownedDatabase: string;
  eventNamespace: string;
  apiBasePath: string;
  dependencies: ModuleDependency[];
  healthEndpoint: string;
  freezeStatus: 'active' | 'frozen';
  complexityClassification: 'LOW' | 'MEDIUM' | 'MEDIUM-HIGH' | 'HIGH';
}

export interface ModuleDependency {
  moduleId: string;
  type: 'kernel' | 'event' | 'api';
  required: boolean;
}

// --- Health Check (K9 Contract) ---
export interface HealthStatus {
  module: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  duration: number;
  details?: Record<string, unknown>;
}

// --- Domain Event (K5 Contract, EVT-001) ---
export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  namespace: string;
  version: number;
  timestamp: Date;
  tenantId: string;
  correlationId: string;
  causationId?: string;
  publisherModule: string;
  payload: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  schemaVersion: number;
  contentType: string;
  idempotencyKey: string;
  traceId: string;
  spanId: string;
}

// --- Event Schema (K5 Schema Registry) ---
export interface EventSchema {
  eventType: string;
  namespace: string;
  version: number;
  ownerModule: string;
  jsonSchema: Record<string, unknown>;
  registeredAt: Date;
  isActive: boolean;
}

// --- Action Registry (ACT-001) ---
export interface ActionDefinition {
  actionName: string;
  moduleId: string;
  type: 'command' | 'query';
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  authorizationRequirements: string[];
  auditClassification: 'none' | 'read' | 'write' | 'critical';
  rateLimitPolicy: RateLimitPolicy;
}

export interface RateLimitPolicy {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  burstLimit: number;
}

// --- Audit Event (K3 Contract, P-017) ---
export interface AuditEvent {
  auditId: string;
  timestamp: Date;
  tenantId: string;
  userId: string;
  moduleId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: 'success' | 'failure' | 'denied';
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  correlationId: string;
}

// --- Configuration (K4 Contract) ---
export interface ModuleConfig {
  moduleId: string;
  environment: string;
  values: Record<string, ConfigValue>;
  version: number;
  updatedAt: Date;
}

export interface ConfigValue {
  key: string;
  value: string | number | boolean;
  encrypted: boolean;
  source: 'default' | 'environment' | 'override';
}

// --- Feature Flag (K4) ---
export interface FeatureFlag {
  flagId: string;
  name: string;
  enabled: boolean;
  moduleId: string;
  tenantOverrides: Record<string, boolean>;
  rolloutPercentage: number;
}

// --- Degradation Contract (DEG-001) ---
export type DegradationMode = 'FULL' | 'PARTIAL' | 'READ_ONLY' | 'OFFLINE';

export interface DegradationContract {
  moduleId: string;
  dependencies: DegradationDependency[];
}

export interface DegradationDependency {
  dependencyId: string;
  onUnavailable: DegradationMode;
  fallbackBehavior: string;
  maxRetries: number;
  circuitBreakerThreshold: number;
}

// --- CQRS Base Types ---
export interface Command<T = unknown> {
  readonly commandId: string;
  readonly commandType: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly payload: T;
}

export interface Query<T = unknown> {
  readonly queryId: string;
  readonly queryType: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly params: T;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetail;
  correlationId: string;
}

export interface QueryResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetail;
  pagination?: PaginationMeta;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// --- Repository Base (P-003 Data Sovereignty) ---
export interface Repository<T> {
  findById(id: string, tenantId: string): Promise<T | null>;
  findAll(tenantId: string, options?: FindOptions): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(id: string, tenantId: string, partial: Partial<T>): Promise<T>;
  delete(id: string, tenantId: string): Promise<void>;
  count(tenantId: string, filters?: Record<string, unknown>): Promise<number>;
}

export interface FindOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, unknown>;
}

// --- Base Entity ---
export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
}
