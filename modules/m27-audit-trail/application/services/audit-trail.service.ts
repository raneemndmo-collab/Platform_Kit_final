import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditEntry, AuditRetentionPolicy, AuditExport } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(
    @InjectRepository(AuditEntry, 'm27_connection') private auditRepo: Repository<AuditEntry>,
    @InjectRepository(AuditRetentionPolicy, 'm27_connection') private retentionRepo: Repository<AuditRetentionPolicy>,
    @InjectRepository(AuditExport, 'm27_connection') private exportRepo: Repository<AuditExport>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async logEntry(tenantId: string, data: {
    action: string; entityType: string; entityId: string; userId: string;
    sourceModule?: string; oldValues?: unknown; newValues?: unknown; ipAddress?: string;
    severity?: string; isSystemGenerated?: boolean; metadata?: unknown;
  }): Promise<AuditEntry> {
    const entry = await this.auditRepo.save(this.auditRepo.create({ tenantId, ...data }));
    if (data.severity === 'critical') {
      this.safeEmit('audit.critical', { tenantId, auditId: entry.id, action: data.action, entityType: data.entityType });
    }
    return entry;
  }

  async queryAuditLog(tenantId: string, filters: {
    entityType?: string; entityId?: string; userId?: string; action?: string;
    startDate?: Date; endDate?: Date; severity?: string; sourceModule?: string;
    page?: number; pageSize?: number;
  }): Promise<{ entries: AuditEntry[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('a').where('a.tenantId = :tenantId', { tenantId });
    if (filters.entityType) qb.andWhere('a.entityType = :entityType', { entityType: filters.entityType });
    if (filters.entityId) qb.andWhere('a.entityId = :entityId', { entityId: filters.entityId });
    if (filters.userId) qb.andWhere('a.userId = :userId', { userId: filters.userId });
    if (filters.action) qb.andWhere('a.action = :action', { action: filters.action });
    if (filters.severity) qb.andWhere('a.severity = :severity', { severity: filters.severity });
    if (filters.sourceModule) qb.andWhere('a.sourceModule = :sourceModule', { sourceModule: filters.sourceModule });
    if (filters.startDate) qb.andWhere('a.timestamp >= :startDate', { startDate: filters.startDate });
    if (filters.endDate) qb.andWhere('a.timestamp <= :endDate', { endDate: filters.endDate });

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const total = await qb.getCount();
    const entries = await qb.orderBy('a.timestamp', 'DESC').skip((page - 1) * pageSize).take(pageSize).getMany();
    return { entries, total };
  }

  async getEntityHistory(tenantId: string, entityType: string, entityId: string): Promise<AuditEntry[]> {
    return this.auditRepo.find({ where: { tenantId, entityType, entityId }, order: { timestamp: 'DESC' } });
  }

  async getUserActivity(tenantId: string, userId: string, limit?: number): Promise<AuditEntry[]> {
    return this.auditRepo.find({ where: { tenantId, userId }, order: { timestamp: 'DESC' }, take: limit || 100 });
  }

  // === Retention ===
  async setRetentionPolicy(tenantId: string, data: { entityType: string; retentionDays: number; expirationAction?: string }): Promise<AuditRetentionPolicy> {
    return this.retentionRepo.save(this.retentionRepo.create({ tenantId, ...data }));
  }

  async getRetentionPolicies(tenantId: string): Promise<AuditRetentionPolicy[]> {
    return this.retentionRepo.find({ where: { tenantId, isActive: true } });
  }

  async applyRetention(tenantId: string): Promise<{ deleted: number; archived: number }> {
    const policies = await this.retentionRepo.find({ where: { tenantId, isActive: true } });
    let deleted = 0, archived = 0;
    for (const policy of policies) {
      const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 3600000);
      const count = await this.auditRepo.count({ where: { tenantId, entityType: policy.entityType } });
      if (policy.expirationAction === 'delete') deleted += count;
      else archived += count;
    }
    this.safeEmit('audit.retention.applied', { tenantId, deleted, archived });
    return { deleted, archived };
  }

  // === Export ===
  async exportAuditLog(tenantId: string, data: { format: string; filters: unknown; requestedBy: string }): Promise<AuditExport> {
    const export_ = await this.exportRepo.save(this.exportRepo.create({ tenantId, ...data, status: 'processing' }));
    const { entries } = await this.queryAuditLog(tenantId, data.filters);
    await this.exportRepo.update(export_.id, { status: 'completed', recordCount: entries.length, completedAt: new Date() });
    this.safeEmit('audit.exported', { tenantId, exportId: export_.id, recordCount: entries.length });
    return this.exportRepo.findOneOrFail({ where: { id: export_.id } });
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.auditRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
