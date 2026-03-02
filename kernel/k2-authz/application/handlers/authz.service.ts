// =============================================================================
import { BoundedMap } from '../../../../shared/bounded-collections';
// K2: Authorization Service
// Constitutional Reference: K2 Contract, P-002
// Performance Envelope: <5ms p95 permission check (in-memory cache)
// =============================================================================

import {
  Injectable, Logger, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisCacheService } from '../../../../shared/redis-cache';
import { transactional } from '../../../../shared/transaction';
import {
  RoleEntity, PermissionEntity, UserRoleEntity, PolicyEntity,
} from '../../domain/entities';

interface PermissionCacheEntry {
  permissions: Set<string>;
  cachedAt: number;
}

@Injectable()
export class K2AuthzService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K2AuthzService.name);
  // In-memory permission cache: <5ms p95 (Performance Envelope)
  private readonly permissionCache = new BoundedMap<string, PermissionCacheEntry>(10_000);
  private readonly MAX_CACHE_SIZE = 50_000; // PERF-001: Prevent OOM with bounded cache
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(RoleEntity, 'k2_connection') private roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity, 'k2_connection') private permRepo: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity, 'k2_connection') private userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(PolicyEntity, 'k2_connection') private policyRepo: Repository<PolicyEntity>,
    private eventEmitter: EventEmitter2,
    private readonly redisCache: RedisCacheService, // SCALE-002: Redis shared permission cache
    @InjectRepository(RoleEntity, 'k2_connection') private readonly _dsHack: Repository<RoleEntity>, // ARC-005: for DataSource access
  ) {}

  // ARC-005: Get DataSource from repository manager
  private get dataSource(): DataSource { return this.roleRepo.manager.connection; }

  // ─── Permission Check (<5ms p95) ────────────────────────────────
  async checkPermission(
    tenantId: string, userId: string, resource: string, action: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const permissionCode = `${resource}:${action}`;
    const cacheKey = `${tenantId}:${userId}`;
    // SCALE-002: Try Redis first, then local BoundedMap
    const redisCacheKey = `authz:perms:${tenantId}:${userId}`;
    try {
      const redisPerms = await this.redisCache.get<string[]>(redisCacheKey);
      if (redisPerms) return { allowed: new Set(redisPerms).has(`${resource}:${action}`), reason: 'redis_cache_hit' };
    } catch (_) { /* Redis unavailable, fall back to local */ }

    // Check cache first (<1ms)
    const cached = this.permissionCache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < this.CACHE_TTL_MS) {
      const allowed = cached.permissions.has(permissionCode) || cached.permissions.has(`${resource}:*`);
      return { allowed, reason: allowed ? 'cache_hit' : 'permission_denied' };
    }

    // Cache miss: load from DB and cache
    const permissions = await this.loadUserPermissions(tenantId, userId);
    // PERF-001 FIX: LRU eviction when cache exceeds max size
    if (this.permissionCache.size >= this.MAX_CACHE_SIZE) {
      const oldest = this.permissionCache.keys().next().value;
      if (oldest) this.permissionCache.delete(oldest);
    }
    this.permissionCache.set(cacheKey, { permissions, cachedAt: Date.now() });

    const allowed = permissions.has(permissionCode) || permissions.has(`${resource}:*`);

    // Check ABAC policies if RBAC denied
    if (!allowed) {
      const abacResult = await this.evaluateAbacPolicies(tenantId, userId, resource, action);
      return abacResult;
    }

    return { allowed, reason: allowed ? 'rbac_granted' : 'permission_denied' };
  }

  private async loadUserPermissions(tenantId: string, userId: string): Promise<Set<string>> {
    // SEC-007 FIX: Single SQL JOIN instead of N+1 queries
    // Was: 1) load userRoles, 2) load roles by IDs separately
    // Now: Single query with JOIN fetches roles + permissions in one round-trip
    const userRolesWithRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoinAndSelect('ur.role', 'role', 'role.tenantId = :tenantId AND role.isActive = true', { tenantId })
      .where('ur.tenantId = :tenantId', { tenantId })
      .andWhere('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .getMany();

    const codes = new Set<string>();
    for (const ur of userRolesWithRoles) {
      const role = (ur as any).role;
      if (role?.permissions && Array.isArray(role.permissions)) {
        for (const code of role.permissions) codes.add(code);
      }
    }

    return codes;
  }

  private async evaluateAbacPolicies(
    tenantId: string, userId: string, resource: string, action: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const policies = await this.policyRepo.find({
      where: { tenantId, resource, action, isActive: true },
    });

    for (const policy of policies) {
      if (policy.effect === 'allow' && this.evaluateConditions(policy.conditions, { userId })) {
        return { allowed: true, reason: `abac_policy:${policy.name}` };
      }
    }

    return { allowed: false, reason: 'no_matching_policy' };
  }

  private evaluateConditions(conditions: Record<string, unknown>, context: Record<string, unknown>): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) return false;
    }
    return true;
  }

  // ─── Role Management ────────────────────────────────────────────
  async createRole(tenantId: string, dto: {
    name: string; description?: string; permissionIds?: string[];
  }): Promise<RoleEntity> {
    const existing = await this.roleRepo.findOne({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException(`Role '${dto.name}' already exists`);

    const role = this.roleRepo.create({
      tenantId, name: dto.name, description: dto.description || '',
      permissions: dto.permissionIds || [], isActive: true, // SEC-006 FIX: save to 'permissions' field
    });
    const saved = await this.roleRepo.save(role);

    this.safeEmit('authz.role.created', { tenantId, roleId: saved.id, name: dto.name });
    return saved;
  }

  async getRoles(tenantId: string): Promise<RoleEntity[]> {
    return this.roleRepo.find({ where: { tenantId } });
  }

  async assignRole(tenantId: string, userId: string, roleId: string, assignedBy: string): Promise<UserRoleEntity> {
    // ARC-005 FIX: Transaction boundary for compound write (role lookup + assignment create)
    return transactional(this.dataSource, async (manager) => {
      const role = await manager.getRepository(RoleEntity).findOne({ where: { tenantId, id: roleId } });
      if (!role) throw new NotFoundException(`Role '${roleId}' not found`);

      const existing = await manager.getRepository(UserRoleEntity).findOne({ where: { tenantId, userId, roleId } });
      if (existing) throw new ConflictException('Role already assigned');

      const assignment = manager.getRepository(UserRoleEntity).create({
        tenantId, userId, roleId, assignedBy, isActive: true,
      });
      const saved = await manager.getRepository(UserRoleEntity).save(assignment);

      // Invalidate cache
      this.permissionCache.delete(`${tenantId}:${userId}`);
      this.safeEmit('authz.role.assigned', { tenantId, userId, roleId, assignedBy });
      return saved;
    });
  }

  async revokeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    const assignment = await this.userRoleRepo.findOne({ where: { tenantId, userId, roleId } });
    if (!assignment) throw new NotFoundException('Role assignment not found');

    assignment.isActive = false;
    await this.userRoleRepo.save(assignment);

    this.permissionCache.delete(`${tenantId}:${userId}`);
    this.safeEmit('authz.role.revoked', { tenantId, userId, roleId });
  }

  // ─── Permission Registration ────────────────────────────────────
  async registerPermission(tenantId: string, dto: {
    code: string; resource: string; action: string; description?: string;
  }): Promise<PermissionEntity> {
    const existing = await this.permRepo.findOne({ where: { tenantId, code: dto.code } });
    if (existing) throw new ConflictException(`Permission '${dto.code}' already exists`);

    const perm = this.permRepo.create({
      tenantId, code: dto.code, resource: dto.resource,
      action: dto.action, description: dto.description || '',
    });
    return this.permRepo.save(perm);
  }

  async getPermissions(tenantId: string): Promise<PermissionEntity[]> {
    return this.permRepo.find({ where: { tenantId } });
  }

  // ─── Policy Management (ABAC) ──────────────────────────────────
  async createPolicy(tenantId: string, dto: {
    name: string; resource: string; action: string;
    effect: 'allow' | 'deny'; conditions: Record<string, unknown>;
  }): Promise<PolicyEntity> {
    const policy = this.policyRepo.create({
      tenantId, ...dto, isActive: true, priority: 0,
    });
    return this.policyRepo.save(policy);
  }

  // ─── Health ─────────────────────────────────────────────────────
  getHealth(): { status: string; cacheSize: number } {
    return {
      status: 'healthy',
      cacheSize: this.permissionCache.size,
    };
  }
}
