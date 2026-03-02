// =============================================================================
// K2: Authorization Kernel — Complete Implementation
// Responsibility: RBAC + ABAC, permission policies, policy engine
// Database: authz_db | Event Namespace: authz.* | API: /api/v1/authz/*
// =============================================================================

import { Entity, Column, Index, Unique } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

// --- Entities ---
@Entity('roles')
@Unique(['tenantId', 'name'])
export class RoleEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isSystemRole!: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  permissions!: string[];

  @Column({ type: 'int', default: 0 })
  priority!: number;
}

@Entity('permissions')
@Unique(['tenantId', 'code'])
@Index('idx_perm_module', ['moduleId'])
export class PermissionEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 256 })
  code!: string;

  @Column({ type: 'varchar', length: 32 })
  moduleId!: string;

  @Column({ type: 'varchar', length: 64 })
  resource!: string;

  @Column({ type: 'varchar', length: 32 })
  action!: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin';

  @Column({ type: 'text', nullable: true })
  description?: string;
}

@Entity('user_roles')
@Unique(['tenantId', 'userId', 'roleId'])
export class UserRoleEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  roleId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;
}

@Entity('policies')
@Unique(['tenantId', 'name'])
export class PolicyEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 32, default: 'allow' })
  effect!: 'allow' | 'deny';

  @Column({ type: 'jsonb' })
  conditions!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '[]' })
  resources!: string[];

  @Column({ type: 'jsonb', default: '[]' })
  actions!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  priority!: number;
}

export { RoleEntity, PermissionEntity, UserRoleEntity, PolicyEntity };

// --- Service ---
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class K2AuthzService {
  private readonly logger = new Logger(K2AuthzService.name);
  // In-memory permission cache for < 5ms p95 (Performance Envelope)
  private readonly permissionCache = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity) private readonly permRepo: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity) private readonly urRepo: Repository<UserRoleEntity>,
    @InjectRepository(PolicyEntity) private readonly policyRepo: Repository<PolicyEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Core authorization check — MUST complete in < 5ms p95
  async checkPermission(
    tenantId: string, userId: string, resource: string, action: string,
  ): Promise<{ allowed: boolean; reason: string }> {
    const cacheKey = `${tenantId}:${userId}`;
    let perms = this.permissionCache.get(cacheKey);

    if (!perms) {
      perms = await this.loadUserPermissions(tenantId, userId);
      this.permissionCache.set(cacheKey, perms);
      // TTL: clear after 5 minutes
      setTimeout(() => this.permissionCache.delete(cacheKey), 300_000);
    }

    const permCode = `${resource}:${action}`;
    const wildcard = `${resource}:*`;
    const superAdmin = '*:*';

    if (perms.has(superAdmin) || perms.has(wildcard) || perms.has(permCode)) {
      return { allowed: true, reason: 'permission_granted' };
    }

    // Check ABAC policies
    const policyResult = await this.evaluatePolicies(tenantId, resource, action);
    if (policyResult !== null) {
      return { allowed: policyResult, reason: policyResult ? 'policy_allow' : 'policy_deny' };
    }

    return { allowed: false, reason: 'no_matching_permission' };
  }

  async createRole(tenantId: string, userId: string, data: Partial<RoleEntity>): Promise<RoleEntity> {
    const role = this.roleRepo.create({ ...data, tenantId, createdBy: userId, updatedBy: userId });
    const saved = await this.roleRepo.save(role);
    this.eventEmitter.emit('authz.role.created', { roleId: saved.id, tenantId });
    return saved;
  }

  async assignRole(tenantId: string, assignerId: string, userId: string, roleId: string): Promise<UserRoleEntity> {
    const role = await this.roleRepo.findOne({ where: { id: roleId, tenantId } });
    if (!role) throw new NotFoundException('Role not found');

    const ur = this.urRepo.create({
      tenantId, userId, roleId, createdBy: assignerId, updatedBy: assignerId,
    });
    const saved = await this.urRepo.save(ur);
    this.permissionCache.delete(`${tenantId}:${userId}`);
    this.eventEmitter.emit('authz.role.assigned', { userId, roleId, tenantId });
    return saved;
  }

  async listRoles(tenantId: string): Promise<RoleEntity[]> {
    return this.roleRepo.find({ where: { tenantId }, order: { priority: 'ASC' } });
  }

  async registerPermission(tenantId: string, data: Partial<PermissionEntity>): Promise<PermissionEntity> {
    const perm = this.permRepo.create({ ...data, tenantId, createdBy: 'system', updatedBy: 'system' });
    return this.permRepo.save(perm);
  }

  private async loadUserPermissions(tenantId: string, userId: string): Promise<Set<string>> {
    const userRoles = await this.urRepo.find({ where: { tenantId, userId } });
    const roleIds = userRoles.map(ur => ur.roleId);
    if (roleIds.length === 0) return new Set();

    const roles = await this.roleRepo.findByIds(roleIds);
    const allPerms = new Set<string>();
    for (const role of roles) {
      for (const perm of role.permissions) {
        allPerms.add(perm);
      }
    }
    return allPerms;
  }

  private async evaluatePolicies(
    tenantId: string, resource: string, action: string,
  ): Promise<boolean | null> {
    const policies = await this.policyRepo.find({
      where: { tenantId, isActive: true },
      order: { priority: 'ASC' },
    });

    for (const policy of policies) {
      if (policy.resources.includes(resource) && policy.actions.includes(action)) {
        return policy.effect === 'allow';
      }
    }
    return null;
  }

  invalidateCache(tenantId: string, userId: string): void {
    this.permissionCache.delete(`${tenantId}:${userId}`);
  }
}
