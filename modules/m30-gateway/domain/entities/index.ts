// =============================================================================
// M30: API Gateway — Domain Entities
// Constitutional Reference: Part 4.4 — M30
// Entities: RouteDefinition, RateLimit, APIKey, RequestLog, TransformationRule
// FORBIDDEN: Business logic in gateway (FP-021)
// =============================================================================

import { Entity, Column, Index } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('route_definitions')
export class RouteDefinitionEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column()
  moduleId: string;

  @Column()
  path: string;

  @Column()
  method: string; // GET, POST, PUT, DELETE, PATCH

  @Column()
  targetService: string;

  @Column()
  targetPath: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 1 })
  apiVersion: number;

  @Column({ type: 'jsonb', nullable: true })
  transformations: Record<string, unknown>;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  requiredPermissions: string[];

  @Column({ nullable: true })
  rateLimitPolicy: string;

  @Column({ nullable: true })
  auditClassification: string;
}

@Entity('rate_limits')
export class RateLimitEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column()
  @Index()
  policyName: string;

  @Column({ default: 100 })
  maxRequestsPerMinute: number;

  @Column({ default: 1000 })
  maxRequestsPerHour: number;

  @Column({ nullable: true })
  moduleId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  burstConfig: Record<string, unknown>;
}

@Entity('api_keys')
export class GatewayApiKeyEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column()
  @Index()
  keyHash: string;

  @Column()
  name: string;

  @Column()
  ownerUserId: string;

  @Column({ type: 'simple-array', nullable: true })
  allowedModules: string[];

  @Column({ type: 'simple-array', nullable: true })
  allowedIps: string[];

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  totalRequests: number;

  @Column({ nullable: true })
  lastUsedAt: Date;
}

@Entity('request_logs')
export class RequestLogEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column()
  @Index()
  requestId: string;

  @Column()
  method: string;

  @Column()
  path: string;

  @Column()
  targetModule: string;

  @Column()
  statusCode: number;

  @Column()
  latencyMs: number;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  errorMessage: string;
}

@Entity('transformation_rules')
export class TransformationRuleEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column()
  name: string;

  @Column()
  routeId: string;

  @Column()
  direction: string; // 'request' | 'response'

  @Column()
  type: string; // 'header', 'body', 'query'

  @Column({ type: 'jsonb' })
  rule: Record<string, unknown>;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  isActive: boolean;

export {
  RouteDefinitionEntity,
  RateLimitEntity,
  GatewayApiKeyEntity,
  RequestLogEntity,
  TransformationRuleEntity,
};
}
