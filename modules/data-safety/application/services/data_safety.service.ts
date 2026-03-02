// Rasid v6.4 — Data Safety & Integrity AI — Section 7
import { BoundedMap } from '../../../../shared/bounded-collections';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataQualityScoringEngine } from '../../../../shared/data-quality';

export interface IntegrityAlert { tenantId: string; field: string; type: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical'; value?: unknown; }

@Injectable()
export class DataSafetyService {
  private safeEmit(event: string, data: unknown): void { try { this.events.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(DataSafetyService.name);
  private readonly history = new BoundedMap<string, number[]>(10_000);
  private readonly qualityEngine = new DataQualityScoringEngine();

  constructor(
    @InjectRepository(require('../../domain/entities/data_safety.entity').DataSafetyEntity, 'data_safety_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  // Section 7.1: Data Quality Scoring — integrated with shared lib
  assessQuality(tenantId: string, data: unknown[], columns: string[]): { overallScore: number; columnScores: Record<string, number>; issues: unknown[]; topAffectedCells: unknown[] } {
    const result = this.qualityEngine.score(data, columns);
    if (result.overallScore < 0.7) {
      this.safeEmit('safety.quality.low', { tenantId, score: result.overallScore, issueCount: result.issues.length });
    }
    return result;
  }

  // Section 7.2: Data Integrity Guard — input validation
  validateInput(tenantId: string, field: string, value: unknown, rules: { type?: string; min?: number; max?: number; pattern?: string }): IntegrityAlert | null {
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        const alert: IntegrityAlert = { tenantId, field, type: 'illogical_input', message: `Value ${value} below minimum ${rules.min}`, severity: 'high', value };
        this.safeEmit('safety.validation.failed', { tenantId, field, type: 'below_min' });
        return alert;
      }
      if (rules.max !== undefined && value > rules.max) {
        const alert: IntegrityAlert = { tenantId, field, type: 'illogical_input', message: `Value ${value} above maximum ${rules.max}`, severity: 'high', value };
        this.safeEmit('safety.validation.failed', { tenantId, field, type: 'above_max' });
        return alert;
      }
    }
    if (rules.pattern && typeof value === 'string') {
      if (!new RegExp(rules.pattern).test(value)) {
        return { tenantId, field, type: 'format_mismatch', message: `Value does not match pattern ${rules.pattern}`, severity: 'medium', value };
      }
    }
    return null;
  }

  // Historical tracking with z-score anomaly detection
  trackAndDetect(tenantId: string, field: string, value: number): IntegrityAlert | null {
    const key = `${tenantId}:${field}`;
    if (!this.history.has(key)) this.history.set(key, []);
    const hist = this.history.get(key)!;

    // Check abnormal change (>50%) vs previous
    if (hist.length > 0) {
      const prev = hist[hist.length - 1];
      const changePct = prev !== 0 ? Math.abs(value - prev) / Math.abs(prev) : 0;
      if (changePct > 0.5) {
        const alert: IntegrityAlert = { tenantId, field, type: 'abnormal_change', message: `Change of ${(changePct * 100).toFixed(1)}% from ${prev} to ${value}`, severity: changePct > 1 ? 'critical' : 'high', value };
        this.safeEmit('safety.alert.raised', { tenantId, field, type: 'abnormal_change', changePct });
        hist.push(value);
        if (hist.length > 200) this.history.set(key, hist.slice(-100));
        return alert;
      }
    }

    // Z-score deviation
    if (hist.length >= 5) {
      const mean = hist.reduce((s, v) => s + v, 0) / hist.length;
      const stdDev = Math.sqrt(hist.reduce((s, v) => s + (v - mean) ** 2, 0) / hist.length);
      if (stdDev > 0) {
        const z = (value - mean) / stdDev;
        if (Math.abs(z) > 3) {
          const alert: IntegrityAlert = { tenantId, field, type: 'severe_deviation', message: `Z-score ${z.toFixed(2)} exceeds ±3σ threshold (mean=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`, severity: 'critical', value };
          this.safeEmit('safety.alert.raised', { tenantId, field, type: 'severe_deviation', zScore: z });
          hist.push(value);
          return alert;
        }
      }
    }

    hist.push(value);
    if (hist.length > 200) this.history.set(key, hist.slice(-100));
    return null;
  }

  // Bulk validation
  async bulkValidate(tenantId: string, records: Array<{ field: string; value: unknown; rules: unknown }>): Promise<{ alerts: IntegrityAlert[]; total: number; passRate: number }> {
    const alerts: IntegrityAlert[] = [];
    for (const rec of records) {
      const alert = this.validateInput(tenantId, rec.field, rec.value, rec.rules);
      if (alert) alerts.push(alert);
    }
    return { alerts, total: records.length, passRate: (records.length - alerts.length) / Math.max(records.length, 1) };
  }

  // Field history
  getFieldHistory(tenantId: string, field: string): { values: number[]; mean: number; stdDev: number; count: number } {
    const hist = this.history.get(`${tenantId}:${field}`) || [];
    if (hist.length === 0) return { values: [], mean: 0, stdDev: 0, count: 0 };
    const mean = hist.reduce((s, v) => s + v, 0) / hist.length;
    const stdDev = Math.sqrt(hist.reduce((s, v) => s + (v - mean) ** 2, 0) / hist.length);
    return { values: [...hist], mean, stdDev, count: hist.length };
  }

  clearHistory(tenantId: string): number {
    let cleared = 0;
    for (const key of this.history.keys()) {
      if (key.startsWith(tenantId)) { this.history.delete(key); cleared++; }
    }
    return cleared;
  }

  async generateReport(tenantId: string): Promise<{ tenantId: string; fieldCount: number; topRisks: string[] }> {
    let fieldCount = 0;
    const topRisks: string[] = [];
    for (const [key, values] of this.history) {
      if (key.startsWith(tenantId)) {
        fieldCount++;
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
        if (stdDev / Math.abs(mean || 1) > 0.5) topRisks.push(key.replace(`${tenantId}:`, ''));
      }
    }
    return { tenantId, fieldCount, topRisks: topRisks.slice(0, 10) };
  }

  async findByTenant(tenantId: string) { return this.repo.find({ where: { tenantId } }); }
}
