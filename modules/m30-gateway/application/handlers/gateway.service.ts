// =============================================================================
// M30: API Gateway — Application Service
// Constitutional: ACT-001 (Action Registry), COM-003 (all calls via gateway)
// FORBIDDEN: Business logic (FP-021). Gateway routes and enforces policies ONLY.
// =============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BoundedMap } from '../../../../shared/bounded-collections';

import {
  RouteDefinitionEntity, RateLimitEntity, GatewayApiKeyEntity,
  RequestLogEntity, TransformationRuleEntity,
} from '../../domain/entities';

@Injectable()
export class M30GatewayService {
  private safeEmit(event: string, data: unknown): void { try { this.safeEmit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } } // B3 FIX
  private readonly logger = new Logger(M30GatewayService.name);
  private routeCache = new BoundedMap<string, RouteDefinitionEntity>(10000);
  private rateLimitCounters = new BoundedMap<string, { count: number; resetAt: number }>(10000);

  constructor(
    @InjectRepository(RouteDefinitionEntity, 'm30_connection') private readonly routeRepo: Repository<RouteDefinitionEntity>,
    @InjectRepository(RateLimitEntity, 'm30_connection') private readonly rateLimitRepo: Repository<RateLimitEntity>,
    @InjectRepository(GatewayApiKeyEntity, 'm30_connection') private readonly apiKeyRepo: Repository<GatewayApiKeyEntity>,
    @InjectRepository(RequestLogEntity, 'm30_connection') private readonly logRepo: Repository<RequestLogEntity>,
    @InjectRepository(TransformationRuleEntity, 'm30_connection') private readonly transformRepo: Repository<TransformationRuleEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- Route Registration (ACT-003) ---

  async registerRoute(tenantId: string, userId: string, dto: Partial<RouteDefinitionEntity>): Promise<RouteDefinitionEntity> {
    const route = this.routeRepo.create({ ...dto, tenantId, createdBy: userId });
    const saved = await this.routeRepo.save(route);
    this.routeCache.set(`${dto.method}:${dto.path}`, saved);
    this.logger.log(`Route registered: ${dto.method} ${dto.path} → ${dto.targetService}`);
    return saved;
  }

  async resolveRoute(tenantId: string, method: string, path: string): Promise<RouteDefinitionEntity> {
    const cacheKey = `${method}:${path}`;
    if (this.routeCache.has(cacheKey)) return this.routeCache.get(cacheKey);

    const route = await this.routeRepo.findOne({
      where: { tenantId, method, path, isActive: true },
    });
    if (!route) throw new NotFoundException(`ACT-003: No registered action for ${method} ${path}`);

    this.routeCache.set(cacheKey, route);
    return route;
  }

  async getRoutes(tenantId: string, moduleId?: string): Promise<RouteDefinitionEntity[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (moduleId) where.moduleId = moduleId;
    return this.routeRepo.find({ where });
  }

  // --- Rate Limiting ---

  async checkRateLimit(tenantId: string, policyName: string, userId: string): Promise<boolean> {
    const policy = await this.rateLimitRepo.findOne({
      where: { tenantId, policyName, isActive: true },
    });
    if (!policy) return true; // No policy = no limit

    const key = `${tenantId}:${policyName}:${userId}`;
    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);

    if (!counter || now > counter.resetAt) {
      this.rateLimitCounters.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }

    if (counter.count >= policy.maxRequestsPerMinute) {
      this.safeEmit('gateway.rate.exceeded', {
        tenantId, userId, policyName,
        limit: policy.maxRequestsPerMinute, timestamp: new Date(),
      });
      return false;
    }

    counter.count++;
    return true;
  }

  async createRateLimitPolicy(tenantId: string, userId: string, dto: Partial<RateLimitEntity>): Promise<RateLimitEntity> {
    const policy = this.rateLimitRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.rateLimitRepo.save(policy);
  }

  // --- API Key Management ---

  async createApiKey(tenantId: string, userId: string, dto: Partial<GatewayApiKeyEntity>): Promise<GatewayApiKeyEntity> {
    const key = this.apiKeyRepo.create({ ...dto, tenantId, ownerUserId: userId, createdBy: userId });
    return this.apiKeyRepo.save(key);
  }

  async validateApiKey(tenantId: string, keyHash: string): Promise<GatewayApiKeyEntity> {
    const key = await this.apiKeyRepo.findOne({
      where: { tenantId, keyHash, isActive: true },
    });
    if (!key) throw new ForbiddenException('Invalid API key');
    if (key.expiresAt && key.expiresAt < new Date()) throw new ForbiddenException('API key expired');

    key.totalRequests++;
    key.lastUsedAt = new Date();
    await this.apiKeyRepo.save(key);
    return key;
  }

  // --- Request Logging ---

  async logRequest(tenantId: string, data: Partial<RequestLogEntity>): Promise<void> {
    const log = this.logRepo.create({ ...data, tenantId });
    await this.logRepo.save(log);
  }

  async getAnalytics(tenantId: string, moduleId?: string, hours = 24): Promise<unknown> {
    const since = new Date(Date.now() - hours * 3600_000);
    const where: Record<string, unknown> = { tenantId };
    if (moduleId) where.targetModule = moduleId;

    const logs = await this.logRepo.find({ where, order: { createdAt: 'DESC' } });
    const total = logs.length;
    const errors = logs.reduce((c, l) => c + (l.statusCode >= 400 ? 1 : 0), 0);
    const avgLatency = total > 0 ? logs.reduce((s, l) => s + l.latencyMs, 0) / total : 0;

    return { total, errors, errorRate: total > 0 ? errors / total : 0, avgLatencyMs: Math.round(avgLatency) };
  }
}
