// ═══════════════════════════════════════════════════════════════════════════════
// محرك التحليلات — Analytics Engine
// رصيد v6.4 — توليد الرؤى والتقارير الديناميكية
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';
import { CircuitBreaker } from '../../circuit-breaker';

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'median' | 'percentile' | 'stddev';
export type TimeGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface AnalyticsQuery {
  tenantId: string;
  dataSource: string;
  metrics: Array<{ field: string; aggregation: AggregationType }>;
  dimensions: string[];
  filters?: Record<string, unknown>;
  timeRange?: { start: Date; end: Date };
  granularity?: TimeGranularity;
  limit?: number;
}

export interface AnalyticsResult {
  tenantId: string;
  query: AnalyticsQuery;
  data: Record<string, unknown>[];
  summary: Record<string, number>;
  insights: AnalyticsInsight[];
  executionTimeMs: number;
  rowCount: number;
  correlationId: string;
}

export interface AnalyticsInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'forecast' | 'threshold';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  data: Record<string, unknown>;
}

export interface DataPipeline {
  id: string;
  tenantId: string;
  name: string;
  stages: PipelineStage[];
  schedule?: string;
  status: 'active' | 'paused' | 'error';
}

export interface PipelineStage {
  name: string;
  type: 'extract' | 'transform' | 'load' | 'validate' | 'enrich';
  config: Record<string, unknown>;
}

@Injectable()
export class AnalyticsEngine {
  private readonly logger = new Logger(AnalyticsEngine.name);
  private readonly breaker = new CircuitBreaker('analytics-engine', 5, 30000);
  private readonly queryCache = new BoundedMap<string, AnalyticsResult>(10000);
  private readonly pipelines = new BoundedMap<string, DataPipeline[]>(1000);
  private readonly dataStore = new BoundedMap<string, Record<string, unknown>[]>(5000);

  /** تنفيذ استعلام تحليلي */
  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey(query);
    const correlationId = `analytics_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // التحقق من الكاش
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.executionTimeMs < 60000) {
      this.logger.debug(`كاش: ${cacheKey}`);
      return { ...cached, correlationId };
    }

    return this.breaker.execute(async () => {
      this.logger.log(`تحليل: tenant=${query.tenantId} source=${query.dataSource}`);

      // استخراج البيانات
      const rawData = await this.extractData(query);

      // تطبيق التجميعات
      const aggregated = this.aggregate(rawData, query.metrics, query.dimensions);

      // توليد الملخص
      const summary = this.buildSummary(aggregated, query.metrics);

      // توليد الرؤى التلقائية
      const insights = this.generateInsights(aggregated, query);

      const result: AnalyticsResult = {
        tenantId: query.tenantId,
        query,
        data: aggregated,
        summary,
        insights,
        executionTimeMs: Date.now() - startTime,
        rowCount: aggregated.length,
        correlationId,
      };

      this.queryCache.set(cacheKey, result);
      return result;
    });
  }

  /** إنشاء خط أنابيب بيانات */
  createPipeline(pipeline: DataPipeline): DataPipeline {
    this.logger.log(`إنشاء خط أنابيب: ${pipeline.name} tenant=${pipeline.tenantId}`);
    const tenantPipelines = this.pipelines.get(pipeline.tenantId) || [];
    tenantPipelines.push(pipeline);
    this.pipelines.set(pipeline.tenantId, tenantPipelines);
    return pipeline;
  }

  /** تنفيذ خط أنابيب */
  async executePipeline(tenantId: string, pipelineId: string): Promise<Record<string, unknown>> {
    const tenantPipelines = this.pipelines.get(tenantId) || [];
    const pipeline = tenantPipelines.find(p => p.id === pipelineId);
    if (!pipeline) throw new Error(`خط أنابيب غير موجود: ${pipelineId}`);

    this.logger.log(`تنفيذ خط أنابيب: ${pipeline.name}`);
    let data: unknown = null;

    for (const stage of pipeline.stages) {
      switch (stage.type) {
        case 'extract': data = await this.pipelineExtract(tenantId, stage.config); break;
        case 'transform': data = this.pipelineTransform(data, stage.config); break;
        case 'validate': data = this.pipelineValidate(data, stage.config); break;
        case 'enrich': data = this.pipelineEnrich(data, stage.config); break;
        case 'load': await this.pipelineLoad(tenantId, data, stage.config); break;
      }
    }

    return { success: true, pipelineId, stages: pipeline.stages.length };
  }

  private async extractData(query: AnalyticsQuery): Promise<Record<string, unknown>[]> {
    return this.dataStore.get(`${query.tenantId}:${query.dataSource}`) || [];
  }

  private aggregate(
    data: Record<string, unknown>[],
    metrics: Array<{ field: string; aggregation: AggregationType }>,
    dimensions: string[],
  ): Record<string, unknown>[] {
    if (dimensions.length === 0) {
      const result: Record<string, unknown> = {};
      for (const metric of metrics) {
        const values = data.map(d => Number(d[metric.field]) || 0);
        result[`${metric.aggregation}_${metric.field}`] = this.computeAggregation(values, metric.aggregation);
      }
      return [result];
    }

    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const key = dimensions.map(d => String(row[d] ?? '')).join('|');
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    }

    return [...groups.entries()].map(([key, rows]) => {
      const result: Record<string, unknown> = {};
      const dimValues = key.split('|');
      dimensions.forEach((d, i) => { result[d] = dimValues[i]; });
      for (const metric of metrics) {
        const values = rows.map(r => Number(r[metric.field]) || 0);
        result[`${metric.aggregation}_${metric.field}`] = this.computeAggregation(values, metric.aggregation);
      }
      return result;
    });
  }

  private computeAggregation(values: number[], type: AggregationType): number {
    if (values.length === 0) return 0;
    switch (type) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'count': return values.length;
      case 'median': { const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
      case 'stddev': { const avg = values.reduce((a, b) => a + b, 0) / values.length; return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length); }
      default: return 0;
    }
  }

  private buildSummary(data: Record<string, unknown>[], metrics: Array<{ field: string; aggregation: AggregationType }>): Record<string, number> {
    const summary: Record<string, number> = { totalRows: data.length };
    for (const metric of metrics) {
      const key = `${metric.aggregation}_${metric.field}`;
      const values = data.map(d => Number(d[key]) || 0);
      summary[`total_${key}`] = values.reduce((a, b) => a + b, 0);
    }
    return summary;
  }

  private generateInsights(data: Record<string, unknown>[], query: AnalyticsQuery): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    if (data.length > 1) {
      insights.push({
        type: 'trend',
        title: 'اتجاه البيانات',
        description: `تم تحليل ${data.length} سجل من مصدر ${query.dataSource}`,
        severity: 'info',
        confidence: 0.85,
        data: { rowCount: data.length },
      });
    }
    return insights;
  }

  private async pipelineExtract(tenantId: string, config: Record<string, unknown>): Promise<unknown> {
    return this.dataStore.get(`${tenantId}:${config.source}`) || [];
  }
  private pipelineTransform(data: unknown, config: Record<string, unknown>): unknown { return data; }
  private pipelineValidate(data: unknown, config: Record<string, unknown>): unknown { return data; }
  private pipelineEnrich(data: unknown, config: Record<string, unknown>): unknown { return data; }
  private async pipelineLoad(tenantId: string, data: unknown, config: Record<string, unknown>): Promise<void> {
    this.dataStore.set(`${tenantId}:${config.target}`, data as Record<string, unknown>[]);
  }

  private buildCacheKey(query: AnalyticsQuery): string {
    return `${query.tenantId}:${query.dataSource}:${JSON.stringify(query.metrics)}:${JSON.stringify(query.dimensions)}`;
  }
}
