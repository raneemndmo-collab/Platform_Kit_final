// =============================================================================
import { BoundedMap } from '../../../../shared/bounded-collections';
// K9: Monitoring Service
// Constitutional Reference: K9 Contract
// Performance Envelope: 15-second health check interval
// =============================================================================

import {
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  HealthRecordEntity, MetricSnapshotEntity,
  AlertRuleEntity, AlertIncidentEntity,
} from '../../domain/entities';

@Injectable()
export class K9MonitoringService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K9MonitoringService.name);
  // In-memory health map for fast lookups
  private readonly moduleHealth = new BoundedMap<string, {
    status: string; lastCheck: Date; responseTimeMs: number;
  }>(10_000);

  constructor(
    @InjectRepository(HealthRecordEntity, 'k9_connection') private healthRepo: Repository<HealthRecordEntity>,
    @InjectRepository(MetricSnapshotEntity, 'k9_connection') private metricRepo: Repository<MetricSnapshotEntity>,
    @InjectRepository(AlertRuleEntity, 'k9_connection') private alertRuleRepo: Repository<AlertRuleEntity>,
    @InjectRepository(AlertIncidentEntity, 'k9_connection') private incidentRepo: Repository<AlertIncidentEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Health Recording (15s interval) ────────────────────────────
  async recordHealth(tenantId: string, dto: {
    moduleId: string; status: string; responseTimeMs?: number;
    cpuUsagePercent?: number; memoryUsageMb?: number;
    activeConnections?: number; details?: Record<string, unknown>;
  }): Promise<HealthRecordEntity> {
    const record = this.healthRepo.create({
      tenantId, ...dto, recordedAt: new Date(),
    });
    const saved = await this.healthRepo.save(record);

    // Update in-memory map
    this.moduleHealth.set(`${tenantId}:${dto.moduleId}`, {
      status: dto.status,
      lastCheck: new Date(),
      responseTimeMs: dto.responseTimeMs || 0,
    });

    // Check alert rules
    if (dto.responseTimeMs) {
      await this.evaluateAlerts(tenantId, dto.moduleId, 'response_time', dto.responseTimeMs);
    }
    if (dto.cpuUsagePercent) {
      await this.evaluateAlerts(tenantId, dto.moduleId, 'cpu_usage', dto.cpuUsagePercent);
    }
    if (dto.memoryUsageMb) {
      await this.evaluateAlerts(tenantId, dto.moduleId, 'memory_usage', dto.memoryUsageMb);
    }

    return saved;
  }

  async getModuleHealth(tenantId: string, moduleId: string): Promise<{
    status: string; lastCheck: Date; history: HealthRecordEntity[];
  }> {
    const cached = this.moduleHealth.get(`${tenantId}:${moduleId}`);
    const history = await this.healthRepo.find({
      where: { tenantId, moduleId },
      order: { recordedAt: 'DESC' },
      take: 20,
    });

    return {
      status: cached?.status || 'unknown',
      lastCheck: cached?.lastCheck || null,
      history,
    };
  }

  async getAllModuleHealth(tenantId: string): Promise<Array<{
    moduleId: string; status: string; lastCheck: Date;
  }>> {
    const result: Array<{ moduleId: string; status: string; lastCheck: Date }> = [];
    for (const [key, value] of this.moduleHealth.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        result.push({
          moduleId: key.replace(`${tenantId}:`, ''),
          status: value.status,
          lastCheck: value.lastCheck,
        });
      }
    }
    return result;
  }

  // ─── Metrics ────────────────────────────────────────────────────
  async recordMetric(tenantId: string, dto: {
    moduleId: string; metricName: string; metricType: string;
    value: number; unit?: string; labels?: Record<string, string>;
  }): Promise<MetricSnapshotEntity> {
    const metric = this.metricRepo.create({
      tenantId, ...dto, recordedAt: new Date(),
    });
    return this.metricRepo.save(metric);
  }

  async getMetrics(tenantId: string, moduleId: string, metricName?: string, limit?: number): Promise<MetricSnapshotEntity[]> {
    const where: Record<string, unknown> = { tenantId, moduleId };
    if (metricName) where.metricName = metricName;
    return this.metricRepo.find({
      where, order: { recordedAt: 'DESC' }, take: limit || 100,
    });
  }

  // ─── Alert Rules ────────────────────────────────────────────────
  async createAlertRule(tenantId: string, dto: {
    name: string; moduleId: string; metricName: string;
    operator: string; threshold: number; severity?: string;
    evaluationWindowSeconds?: number; consecutiveBreaches?: number;
    notificationChannels?: string[];
  }): Promise<AlertRuleEntity> {
    const rule = this.alertRuleRepo.create({
      tenantId, ...dto, isActive: true,
    });
    return this.alertRuleRepo.save(rule);
  }

  async getAlertRules(tenantId: string, moduleId?: string): Promise<AlertRuleEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (moduleId) where.moduleId = moduleId;
    return this.alertRuleRepo.find({ where });
  }

  async toggleAlertRule(tenantId: string, ruleId: string, isActive: boolean): Promise<AlertRuleEntity> {
    const rule = await this.alertRuleRepo.findOne({ where: { tenantId, id: ruleId } });
    if (!rule) throw new NotFoundException('Alert rule not found');
    rule.isActive = isActive;
    return this.alertRuleRepo.save(rule);
  }

  // ─── Alert Evaluation ──────────────────────────────────────────
  private async evaluateAlerts(tenantId: string, moduleId: string, metricName: string, value: number): Promise<void> {
    const rules = await this.alertRuleRepo.find({
      where: { tenantId, moduleId, metricName, isActive: true },
    });

    for (const rule of rules) {
      const breached = this.checkThreshold(value, rule.operator, rule.threshold);
      if (breached) {
        // Check for existing open incident
        const existing = await this.incidentRepo.findOne({
          where: { tenantId, ruleId: rule.id, status: 'open' },
        });

        if (!existing) {
          const incident = this.incidentRepo.create({
            tenantId, ruleId: rule.id, ruleName: rule.name,
            moduleId, severity: rule.severity, status: 'open',
            triggeredValue: value, thresholdValue: rule.threshold,
          });
          await this.incidentRepo.save(incident);

          this.safeEmit('monitoring.alert.triggered', {
            tenantId, ruleId: rule.id, moduleId, severity: rule.severity,
            value, threshold: rule.threshold,
          });
        }
      }
    }
  }

  private checkThreshold(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }

  // ─── Incident Management ────────────────────────────────────────
  async getIncidents(tenantId: string, status?: string): Promise<AlertIncidentEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.incidentRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async acknowledgeIncident(tenantId: string, incidentId: string, userId: string): Promise<AlertIncidentEntity> {
    const incident = await this.incidentRepo.findOne({ where: { tenantId, id: incidentId } });
    if (!incident) throw new NotFoundException('Incident not found');
    incident.status = 'acknowledged';
    incident.acknowledgedBy = userId;
    incident.acknowledgedAt = new Date();
    return this.incidentRepo.save(incident);
  }

  async resolveIncident(tenantId: string, incidentId: string, note?: string): Promise<AlertIncidentEntity> {
    const incident = await this.incidentRepo.findOne({ where: { tenantId, id: incidentId } });
    if (!incident) throw new NotFoundException('Incident not found');
    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.resolutionNote = note || '';
    return this.incidentRepo.save(incident);
  }

  // ─── Health ────────────────────────────────────────────────────
  getHealth(): { status: string; module: string; trackedModules: number } {
    return {
      status: 'healthy',
      module: 'K9-Monitoring',
      trackedModules: this.moduleHealth.size,
    };
  }
}
