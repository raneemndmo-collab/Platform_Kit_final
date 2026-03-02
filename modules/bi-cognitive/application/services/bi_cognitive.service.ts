// Rasid v6.4 — BI Cognitive Acceleration — Section 4
// FIX A1: All engines as class-level singletons
// FIX B3: SafeEmit wrapper for all event emissions
// FIX B4: BoundedMap for internal caches
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdaptiveAggregationPlanner } from '../../../../shared/adaptive-aggregation';
import { DensityPreservingSampler } from '../../../../shared/density-sampling';
import { NarrativeCoherenceEngine } from '../../../../shared/narrative-coherence';
import { DesignStabilityScoringEngine } from '../../../../shared/design-stability';
import { ColumnarCacheEngine } from '../../../../shared/columnar-cache';
import { VisualStabilityEngine } from '../../../../shared/visual-stability';
import { RealTimeInsightEngine } from '../../../../shared/insight-engine';
import { CircuitBreaker } from '../../../../shared/circuit-breaker';


interface DashboardChart { id: string; type: string; dataPoints?: number; categories?: number; }
interface DashboardKPI { id: string; importance?: number; }
interface DashboardInput { charts: DashboardChart[]; kpis: DashboardKPI[]; filters: unknown[]; width: number; height: number; }
interface DashboardInsight { type: string; message: string; priority: number; }
interface VisSuggestion { chartId: string; currentType: string; suggested: string; reason: string; }
interface ElementRect { id: string; x: number; y: number; width: number; height: number; }
interface MetricDash { id: string; metrics: Record<string, number[]>; }
interface CrossPattern { sharedMetrics: string[]; conflictingMeasures: Array<{ metric: string; dashboards: string[]; values: number[] }>; correlations: Array<{ metricA: string; metricB: string; strength: number }>; }

@Injectable()
export class BiCognitiveService {
  private readonly breaker = new CircuitBreaker('BiCognitiveService', 5, 30000);

  private readonly logger = new Logger(BiCognitiveService.name);
  // FIX A1: All engines instantiated ONCE at class level
  private readonly stabilityEngine = new VisualStabilityEngine();
  private readonly insightEngine = new RealTimeInsightEngine();
  private readonly aggregationPlanner = new AdaptiveAggregationPlanner();
  private readonly densitySampler = new DensityPreservingSampler();
  private readonly narrativeEngine = new NarrativeCoherenceEngine();
  private readonly designStabilityEngine = new DesignStabilityScoringEngine();
  private readonly columnarCache = new ColumnarCacheEngine(); // FIX A1: SINGLE instance — cache now actually works

  constructor(
    @InjectRepository(require('../../domain/entities/bi_cognitive.entity').BiCognitiveEntity, 'bi_cognitive_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  // FIX B3: Safe event emission wrapper
  private safeEmit(event: string, data: unknown): void {
    try { this.events.emit(event, data); }
    catch (e) { this.logger.error(`Event ${event} failed: ${e}`); }
  }

  // Section 4.2: Dashboard Intelligence Layer
  analyzeDashboard(tenantId: string, dashboard: DashboardInput): { insights: DashboardInsight[]; suggestedVisualizations: VisSuggestion[]; } {
    const insights: DashboardInsight[] = [];
    const suggestedVisualizations: VisSuggestion[] = [];
    if (dashboard.charts.length > 6) insights.push({ type: 'crowding', message: `Dashboard has ${dashboard.charts.length} charts — consider splitting into tabs`, priority: 0.9 });
    if (dashboard.kpis.length > 1) {
      const sorted = [...dashboard.kpis].sort((a, b) => (b.importance || 0) - (a.importance || 0));
      if (sorted.some((k, i) => k.id !== dashboard.kpis[i]?.id)) insights.push({ type: 'kpi_reorder', message: 'KPIs could be reordered by importance', priority: 0.7 });
    }
    for (const chart of dashboard.charts) {
      if (chart.type === 'table' && (chart.dataPoints || 0) > 10) suggestedVisualizations.push({ chartId: chart.id, currentType: 'table', suggested: 'bar_chart', reason: 'Tables with many rows are harder to scan' });
      if (chart.type === 'pie' && (chart.categories || 0) > 6) suggestedVisualizations.push({ chartId: chart.id, currentType: 'pie', suggested: 'bar_chart', reason: 'Pie >6 slices reduces readability' });
    }
    const totalElements = dashboard.charts.length + dashboard.kpis.length + dashboard.filters.length;
    const density = totalElements / ((dashboard.width * dashboard.height) / 10000);
    if (density > 5) insights.push({ type: 'readability', message: 'High element density — increase whitespace', priority: 0.6 });
    this.safeEmit('bi.insight.generated', { tenantId, insightCount: insights.length });
    return { insights, suggestedVisualizations };
  }

  // Section 4.3: Cross-Dashboard Pattern Intelligence
  detectCrossPatterns(tenantId: string, dashboards: MetricDash[]): CrossPattern {
    const metricMap = new Map<string, Array<{ dashId: string; values: number[] }>>();
    for (const dash of dashboards) {
      for (const [metric, values] of Object.entries(dash.metrics)) {
        if (!metricMap.has(metric)) metricMap.set(metric, []);
        metricMap.get(metric)!.push({ dashId: dash.id, values });
      }
    }
    const sharedMetrics = [...metricMap.entries()].filter(([, d]) => d.length > 1).map(([m]) => m);
    const conflictingMeasures: CrossPattern['conflictingMeasures'] = [];
    for (const metric of sharedMetrics) {
      const dashes = metricMap.get(metric)!;
      const latestValues = dashes.map(d => d.values[d.values.length - 1] || 0);
      const mean = latestValues.reduce((s, v) => s + v, 0) / latestValues.length;
      if (latestValues.some(v => Math.abs(v - mean) / (Math.abs(mean) || 1) > 0.2)) {
        conflictingMeasures.push({ metric, dashboards: dashes.map(d => d.dashId), values: latestValues });
      }
    }
    const correlations: CrossPattern['correlations'] = [];
    const metrics = [...metricMap.keys()];
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const aVals = metricMap.get(metrics[i])![0]?.values || [];
        const bVals = metricMap.get(metrics[j])![0]?.values || [];
        const len = Math.min(aVals.length, bVals.length);
        if (len < 3) continue;
        const a = aVals.slice(-len), b = bVals.slice(-len);
        const mA = a.reduce((s, v) => s + v, 0) / len, mB = b.reduce((s, v) => s + v, 0) / len;
        let num = 0, dA = 0, dB = 0;
        for (let k = 0; k < len; k++) { num += (a[k] - mA) * (b[k] - mB); dA += (a[k] - mA) ** 2; dB += (b[k] - mB) ** 2; }
        const corr = (dA > 0 && dB > 0) ? num / Math.sqrt(dA * dB) : 0;
        if (Math.abs(corr) > 0.6) correlations.push({ metricA: metrics[i], metricB: metrics[j], strength: corr });
      }
    }
    if (conflictingMeasures.length > 0) this.safeEmit('bi.conflict.detected', { tenantId, count: conflictingMeasures.length });
    this.safeEmit('bi.pattern.detected', { tenantId, sharedMetrics: sharedMetrics.length, correlations: correlations.length });
    return { sharedMetrics, conflictingMeasures, correlations };
  }

  // Section 4.4 + GAP-20: Visual Stability
  ensureVisualStability(tenantId: string, before: ElementRect[], after: ElementRect[]): { stable: boolean; maxShift: number; lockedElements: string[]; } {
    this.stabilityEngine.captureSnapshot('before', before);
    this.stabilityEngine.captureSnapshot('after', after);
    const result = this.stabilityEngine.checkStability('before', 'after');
    if (!result.stable) this.safeEmit('bi.stability.violation', { tenantId, maxShift: result.maxShift });
    return { stable: result.stable, maxShift: result.maxShift, lockedElements: before.map(e => e.id) };
  }

  // 4.1: Sudden change detection with auto-explanation
  detectSuddenChanges(tenantId: string, field: string, values: number[], relatedFields?: Record<string, number[]>): Array<{ type: 'spike' | 'drop'; value: number; index: number; explanation: string; probableCause: string }> {
    if (values.length < 3) return [];
    const alerts: Array<{ type: 'spike' | 'drop'; value: number; index: number; explanation: string; probableCause: string }> = [];
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    for (let i = 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      const changePct = values[i - 1] !== 0 ? Math.abs(change / values[i - 1]) : 0;
      const z = stdDev > 0 ? Math.abs(values[i] - mean) / stdDev : 0;
      if (z > 2.5 || changePct > 0.5) {
        const type: 'spike' | 'drop' = change > 0 ? 'spike' : 'drop';
        let probableCause = 'Requires investigation';
        if (relatedFields) {
          for (const [rf, rv] of Object.entries(relatedFields)) {
            if (rv.length > i && rv[i - 1] !== 0) {
              const rfChange = Math.abs(rv[i] - rv[i - 1]) / Math.abs(rv[i - 1]);
              if (rfChange > 0.3) { probableCause = `Correlated with ${(rfChange * 100).toFixed(0)}% change in ${rf}`; break; }
            }
          }
        }
        alerts.push({ type, value: values[i], index: i, explanation: `${field}[${i}]=${values[i]} (${type} ${(changePct * 100).toFixed(1)}%)`, probableCause });
        this.safeEmit('bi.alert.instant', { tenantId, field, type, index: i });
      }
    }
    return alerts;
  }

  // 4.1: Real-time insight via shared lib
  analyzeDataStream(tenantId: string, field: string, values: number[]): unknown { return this.insightEngine.analyze(field, values); }

  // 4.4: Density ratio preservation
  preserveDensityRatio(_tenantId: string, before: ElementRect[], after: ElementRect[], canvasW: number, canvasH: number): { preserved: boolean; beforeDensity: number; afterDensity: number; adjustments: Array<{ id: string; widthScale: number; heightScale: number }>; } {
    const calcDensity = (els: ElementRect[]) => els.reduce((s, e) => s + e.width * e.height, 0) / (canvasW * canvasH);
    const bd = calcDensity(before), ad = calcDensity(after);
    const ratio = bd > 0 ? ad / bd : 1;
    const adjustments: Array<{ id: string; widthScale: number; heightScale: number }> = [];
    if (Math.abs(ratio - 1) > 0.1) {
      const sf = Math.sqrt(bd / (ad || 0.001));
      for (const el of after) adjustments.push({ id: el.id, widthScale: sf, heightScale: sf });
    }
    return { preserved: Math.abs(ratio - 1) <= 0.1, beforeDensity: bd, afterDensity: ad, adjustments };
  }

  // FIX A1: Integrated orphaned shared libraries — use class-level singletons
  planAggregation(rowCount: number, columnCount: number, tenantId: string): unknown { return this.aggregationPlanner.plan(rowCount, columnCount, tenantId); }
  sampleForVisualization(data: unknown[], maxPoints: number, mode: 'STRICT' | 'PROFESSIONAL' = 'PROFESSIONAL'): unknown { return this.densitySampler.sample(data as any[], maxPoints, mode); }
  analyzeNarrativeCoherence(elements: Array<{ id: string; type: string; title: string; content: string; order: number; dataRef?: string }>): unknown { return this.narrativeEngine.analyze(elements); }
  scoreDashboardDesign(elements: Array<{ id: string; x: number; y: number; width: number; height: number; fontSize?: number; fontWeight?: string; contrast?: number }>, cw: number, ch: number): unknown { return this.designStabilityEngine.compute(elements, cw, ch); }

  // FIX A1: Columnar Cache — uses SINGLE class-level instance (cache actually works now!)
  cacheColumnData(tenantId: string, column: string, data: unknown[], ttlMs: number = 60000): boolean { this.columnarCache.set(tenantId, column, data as any[], ttlMs); return true; }
  getCachedColumnDeterministic(tenantId: string, column: string, orderKey: string = '_rowIndex'): { data: unknown[]; ordered: boolean } { return this.columnarCache.getWithDeterministicOrder(tenantId, column, orderKey); }

  async findByTenant(tenantId: string) { return this.breaker.execute(async () => { return this.repo.find({ where: { tenantId });} }); }
}
