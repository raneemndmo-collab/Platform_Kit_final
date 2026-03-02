import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsEvent, AnalyticsDashboard, AnalyticsMetric, DataLakeEntry } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent, 'm12_connection') private eventRepo: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsDashboard, 'm12_connection') private dashRepo: Repository<AnalyticsDashboard>,
    @InjectRepository(AnalyticsMetric, 'm12_connection') private metricRepo: Repository<AnalyticsMetric>,
    @InjectRepository(DataLakeEntry, 'm12_connection') private lakeRepo: Repository<DataLakeEntry>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async ingestEvent(tenantId: string, data: { eventType: string; sourceModule: string; payload: unknown; userId?: string }): Promise<AnalyticsEvent> {
    const event = await this.eventRepo.save(this.eventRepo.create({ tenantId, ...data, timestamp: new Date() }));
    // Auto-route to data lake (hot tier)
    await this.lakeRepo.save(this.lakeRepo.create({
      tenantId, tier: 'hot', sourceModule: data.sourceModule, dataType: data.eventType, data: data.payload,
    }));
    this.safeEmit('analytics.event.ingested', { tenantId, eventType: data.eventType });
    return event;
  }

  async ingestBatch(tenantId: string, events: unknown[]): Promise<{ ingested: number }> {
    const entities = events.map(e => this.eventRepo.create({ tenantId, ...e, timestamp: new Date() }));
    await this.eventRepo.save(entities);
    this.safeEmit('analytics.batch.ingested', { tenantId, count: events.length });
    return { ingested: events.length };
  }

  async queryMetrics(tenantId: string, data: { metricName: string; from: Date; to: Date; granularity?: string }): Promise<AnalyticsMetric[]> {
    return this.metricRepo.find({
      where: { tenantId, metricName: data.metricName, periodStart: Between(data.from, data.to) },
      order: { periodStart: 'ASC' },
    });
  }

  async computeMetric(tenantId: string, data: { metricName: string; aggregationType: string; dimensions: unknown; periodStart: Date; periodEnd: Date; granularity: string }): Promise<AnalyticsMetric> {
    const count = await this.eventRepo.count({ where: { tenantId, eventType: data.metricName } });
    return this.metricRepo.save(this.metricRepo.create({ tenantId, ...data, value: count }));
  }

  // === Data Lake ===
  async promoteTier(tenantId: string, entryId: string, toTier: string): Promise<void> {
    await this.lakeRepo.update({ id: entryId, tenantId }, { tier: toTier, promotedAt: new Date() });
  }

  async queryDataLake(tenantId: string, tier?: string, sourceModule?: string): Promise<DataLakeEntry[]> {
    const where: Record<string, unknown> = { tenantId }; if (tier) where.tier = tier; if (sourceModule) where.sourceModule = sourceModule;
    return this.lakeRepo.find({ where, take: 100, order: { createdAt: 'DESC' } });
  }

  // === Dashboards ===
  async createDashboard(tenantId: string, data: { name: string; widgets: unknown[]; ownerId: string }): Promise<AnalyticsDashboard> {
    return this.dashRepo.save(this.dashRepo.create({ tenantId, ...data }));
  }

  async listDashboards(tenantId: string): Promise<AnalyticsDashboard[]> {
    return this.dashRepo.find({ where: { tenantId } });
  }

  async getPipelineStats(tenantId: string): Promise<{ totalEvents: number; hotTier: number; warmTier: number; coldTier: number }> {
    const totalEvents = await this.eventRepo.count({ where: { tenantId } });
    const hotTier = await this.lakeRepo.count({ where: { tenantId, tier: 'hot' } });
    const warmTier = await this.lakeRepo.count({ where: { tenantId, tier: 'warm' } });
    const coldTier = await this.lakeRepo.count({ where: { tenantId, tier: 'cold' } });
    return { totalEvents, hotTier, warmTier, coldTier };
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.eventRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }

  // A3 FIX: Batch event tracking — single DB write
  async batchTrack(tenantId: string, events: Array<{ name: string; properties?: Record<string, unknown> }>): Promise<{ saved: number }> {
    const entities = events.map(e => this.eventRepo.create({ tenantId, name: e.name, properties: e.properties || {}, timestamp: new Date() }));
    await this.eventRepo.save(entities);
    return { saved: entities.length };
  }
}
