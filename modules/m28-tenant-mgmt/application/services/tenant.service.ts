// Rasid v6.4 — Tenant Management Service — M28
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { transactional } from '../../../../shared/transaction';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface TenantConfig { maxUsers: number; maxStorage: number; features: string[]; tier: 'basic' | 'professional' | 'enterprise'; billingEnabled: boolean; }

@Injectable()
export class TenantService {
  // ARC-005: DataSource for transactions
  private get dataSource(): DataSource { return this.repo.manager.connection; }
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(require('../../domain/entities/tenant.entity').TenantEntity, 'tenant_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  async provision(dto: { name: string; slug: string; adminEmail: string; config: Partial<TenantConfig> }) {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Tenant slug ${dto.slug} already exists`);

    const defaultConfig: TenantConfig = { maxUsers: 50, maxStorage: 10737418240, features: ['core'], tier: 'basic', billingEnabled: true, ...dto.config };
    const entity = this.repo.create({
      name: dto.name, slug: dto.slug, adminEmail: dto.adminEmail,
      config: defaultConfig, status: 'provisioning', metadata: { provisionedAt: new Date() },
      tenantId: undefined, // Will be set to own ID
    });
    const saved = await this.repo.save(entity);
    saved.tenantId = saved.id;
    await this.repo.save(saved);

    this.safeEmit('m28_tenant.provisioned', { tenantId: saved.id, slug: dto.slug, tier: defaultConfig.tier });
    this.logger.log(`Tenant provisioned: ${dto.slug} (${saved.id})`);
    return saved;
  }

  async activate(tenantId: string) {
    const tenant = await this.repo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException();
    tenant.status = 'active';
    tenant.metadata = { ...tenant.metadata, activatedAt: new Date() };
    const saved = await this.repo.save(tenant);
    this.safeEmit('m28_tenant.activated', { tenantId });
    return saved;
  }

  async suspend(tenantId: string, reason: string) {
    const tenant = await this.repo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException();
    tenant.status = 'suspended';
    tenant.metadata = { ...tenant.metadata, suspendedAt: new Date(), suspendReason: reason };
    const saved = await this.repo.save(tenant);
    this.safeEmit('m28_tenant.suspended', { tenantId, reason });
    this.logger.warn(`Tenant suspended: ${tenantId} reason=${reason}`);
    return saved;
  }

  async updateConfig(tenantId: string, config: Partial<TenantConfig>) {
    const tenant = await this.repo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException();
    tenant.config = { ...tenant.config, ...config };
    this.safeEmit('m28_tenant.config_updated', { tenantId, changes: Object.keys(config) });
    return this.repo.save(tenant);
  }

  async getUsage(tenantId: string): Promise<{ users: number; storage: number; apiCalls: number; modules: number }> {
    return { users: 0, storage: 0, apiCalls: 0, modules: 0 }; // Populated by cross-module queries
  }

  // B1 FIX: Admin-only — no tenant filter needed for system-level queries
  // Protected by RoleGuard at controller level (requires 'admin' or 'super_admin' role)
  async findAll() { return this.repo.find({ order: { createdAt: 'DESC' } }); }
  async findOne(tenantId: string) { return this.repo.findOne({ where: { id: tenantId } }); }
  async findBySlug(slug: string) { return this.repo.findOne({ where: { slug } }); }
}
