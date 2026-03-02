// Rasid v6.4 — Data Intelligence Service — Section 2
import { BoundedMap } from '../../../../shared/bounded-collections';
// FIX A1: Class-level singleton for QueryOptimizationEngine
// FIX A2: Monte Carlo histogram O(n) single-pass
// FIX A5: Remove unnecessary async
// FIX D1: Replace any with proper types
// FIX B3: Safe event emission
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataIntelligenceRepository } from '../infrastructure/repositories/data_intelligence.repository';
import { QueryOptimizationEngine } from '../../../../shared/query-optimizer';
import { CircuitBreaker } from '../../../../shared/circuit-breaker';


export interface DataModelSuggestion { schemaType: 'star' | 'snowflake'; dimensions: string[]; measures: string[]; factTable: string; dimensionTables: string[]; primaryKeys: Array<{ table: string; keys: string[] }>; relationships: Array<{ from: string; to: string; type: string }>; timeHierarchy?: { field: string; levels: string[] }; confidence: number; }
export interface KPISuggestion { name: string; formula: string; aggregation: string; category: 'revenue' | 'cost' | 'efficiency' | 'growth' | 'retention'; confidence: number; }
export interface PredictiveResult { metric: string; forecast: Array<{ period: string; value: number; lower: number; upper: number }>; confidence: number; model: string; }
interface DataRow { [key: string]: string | number | boolean | null | undefined; }

@Injectable()
export class DataIntelligenceService {
  private readonly breaker = new CircuitBreaker('DataIntelligenceService', 5, 30000);

  private readonly logger = new Logger(DataIntelligenceService.name);
  private readonly queryOptimizer = new QueryOptimizationEngine(); // FIX A1: singleton

  constructor(private readonly repo: DataIntelligenceRepository, private readonly events: EventEmitter2) {}

  private safeEmit(event: string, data: unknown): void {
    try { this.events.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); }
  }

  async listByTenant(tenantId: string) { return this.breaker.execute(async () => { return this.repo.findByTenant(tenantId); });}
  async create(tenantId: string, name: string, config: Record<string, unknown>) { return this.breaker.execute(async () => { return this.repo.create({ tenantId, name, config });}); }

  // FIX A5: removed unnecessary async — these are pure computation
  inferDataModel(headers: string[], sampleData: unknown[][], tableName: string): DataModelSuggestion {
    const fieldTypes = headers.map((h, i) => ({ name: h, type: this.inferFieldType(sampleData.map(r => (r as unknown[])[i])) }));
    const dimensions = fieldTypes.filter(f => f.type === 'string' || f.type === 'date').map(f => f.name);
    const measures = fieldTypes.filter(f => f.type === 'number').map(f => f.name);
    const timeField = fieldTypes.find(f => f.type === 'date');
    const pks = this.detectPrimaryKeys(headers, sampleData as unknown[][]);
    return {
      schemaType: dimensions.length > 5 ? 'snowflake' : 'star', dimensions, measures, factTable: tableName,
      dimensionTables: dimensions.map(d => `dim_${d.toLowerCase()}`),
      primaryKeys: [{ table: tableName, keys: pks }],
      relationships: dimensions.map(d => ({ from: tableName, to: `dim_${d.toLowerCase()}`, type: 'many_to_one' })),
      timeHierarchy: timeField ? { field: timeField.name, levels: ['year', 'quarter', 'month', 'week', 'day'] } : undefined,
      confidence: Math.min(0.95, 0.5 + dimensions.length * 0.05 + measures.length * 0.05),
    };
  }

  deriveKPIs(headers: string[], _sampleData?: unknown[][]): KPISuggestion[] {
    const kpis: KPISuggestion[] = [];
    const lower = headers.map(h => h.toLowerCase());
    if (lower.some(h => h.includes('revenue') || h.includes('sales'))) {
      kpis.push({ name: 'Total Revenue', formula: 'SUM(revenue)', aggregation: 'SUM', category: 'revenue', confidence: 0.95 });
      if (lower.some(h => h.includes('cost'))) kpis.push({ name: 'Profit Margin', formula: '(SUM(revenue)-SUM(cost))/SUM(revenue)', aggregation: 'COMPUTED', category: 'efficiency', confidence: 0.9 });
    }
    if (lower.some(h => h.includes('count') || h.includes('quantity'))) kpis.push({ name: 'Total Count', formula: 'SUM(count)', aggregation: 'SUM', category: 'revenue', confidence: 0.85 });
    if (lower.some(h => h.includes('date') || h.includes('created'))) kpis.push({ name: 'Growth Rate', formula: '(current-previous)/previous*100', aggregation: 'COMPUTED', category: 'growth', confidence: 0.8 });
    return kpis;
  }

  forecast(historicalValues: number[], periods: number): PredictiveResult {
    const n = historicalValues.length;
    if (n < 3) return { metric: 'unknown', forecast: [], confidence: 0, model: 'insufficient_data' };
    const xMean = (n - 1) / 2, yMean = historicalValues.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (historicalValues[i] - yMean); den += (i - xMean) ** 2; }
    const slope = den !== 0 ? num / den : 0, intercept = yMean - slope * xMean;
    const residuals = historicalValues.map((v, i) => v - (slope * i + intercept));
    const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(n - 2, 1));
    const forecast: PredictiveResult['forecast'] = [];
    for (let p = 0; p < periods; p++) {
      const value = slope * (n + p) + intercept, unc = stdError * (1 + (p + 1) * 0.1);
      forecast.push({ period: `P+${p + 1}`, value, lower: value - 1.96 * unc, upper: value + 1.96 * unc });
    }
    return { metric: 'linear_forecast', forecast, confidence: Math.max(0.3, Math.min(0.95, 1 - stdError / Math.abs(yMean || 1))), model: 'linear_regression' };
  }

  // GAP-02: What-if scenario
  whatIfScenario(tenantId: string, baseData: DataRow[], variable: string, adjustments: number[]): Array<{ adjustment: number; label: string; data: DataRow[] }> {
    return adjustments.map(adj => {
      const scenario = baseData.map(r => {
        const clone = { ...r };
        if (typeof clone[variable] === 'number') clone[variable] = (clone[variable] as number) * (1 + adj / 100);
        return clone;
      });
      return { adjustment: adj, label: `${adj >= 0 ? '+' : ''}${adj}%`, data: scenario };
    });
  }

  // GAP-02 + FIX A2: Monte Carlo — O(n) histogram
  monteCarloSimulation(_tenantId: string, baseData: DataRow[], targetField: string, iterations: number = 1000): { percentiles: Record<string, number>; mean: number; stdDev: number; histogram: Array<{ bin: number; count: number }> } {
    const values = baseData.map(r => r[targetField]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return { percentiles: {}, mean: 0, stdDev: 0, histogram: [] };
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const simulated: number[] = [];
    for (let i = 0; i < iterations; i++) {
      let sum = 0;
      for (let j = 0; j < values.length; j++) {
        const u1 = Math.random(), u2 = Math.random();
        sum += mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdDev;
      }
      simulated.push(sum / values.length);
    }
    simulated.sort((a, b) => a - b);
    const pct = (p: number) => simulated[Math.floor(p * simulated.length)] || 0;
    const binCount = 20;
    const min = simulated[0], max = simulated[simulated.length - 1];
    const binW = (max - min) / binCount || 1;
    // FIX A2: Single-pass O(n) histogram instead of O(n × bins)
    const histCounts = new Array(binCount).fill(0);
    for (const v of simulated) {
      const idx = Math.min(binCount - 1, Math.floor((v - min) / binW));
      histCounts[idx]++;
    }
    const histogram = histCounts.map((count, i) => ({ bin: min + i * binW, count }));
    this.safeEmit('data.montecarlo.completed', { iterations, targetField });
    return { percentiles: { p10: pct(0.1), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9), p95: pct(0.95) }, mean, stdDev, histogram };
  }

  // GAP-02: Stress test
  stressTest(_tenantId: string, baseData: DataRow[], targetField: string, shocks: number[]): Array<{ shock: number; impact: number; breaksThreshold: boolean }> {
    const values = baseData.map(r => r[targetField]).filter((v): v is number => typeof v === 'number');
    const mean = values.reduce((s, v) => s + v, 0) / (values.length || 1);
    const maxHist = Math.max(...values, 1);
    return shocks.map(shock => ({ shock, impact: mean * (1 + shock / 100), breaksThreshold: Math.abs(mean * (1 + shock / 100)) > maxHist * 2 }));
  }

  // GAP-02: Cohort analysis
  cohortAnalysis(_tenantId: string, data: DataRow[], cohortField: string, dateField: string, metricField: string): Record<string, Array<{ period: number; value: number; retention: number }>> {
    const cohorts: Record<string, DataRow[]> = {};
    for (const row of data) {
      const key = String(row[cohortField] || 'unknown');
      if (!cohorts[key]) cohorts[key] = [];
      cohorts[key].push(row);
    }
    const result: Record<string, Array<{ period: number; value: number; retention: number }>> = {};
    for (const [key, rows] of Object.entries(cohorts)) {
      const sorted = rows.sort((a, b) => new Date(String(a[dateField])).getTime() - new Date(String(b[dateField])).getTime());
      const initialCount = sorted.length;
      const periodMap = new BoundedMap<number, number[]>(10_000);
      for (const r of sorted) {
        const d = new Date(String(r[dateField]));
        const p = d.getFullYear() * 12 + d.getMonth();
        if (!periodMap.has(p)) periodMap.set(p, []);
        periodMap.get(p)!.push(Number(r[metricField]) || 0);
      }
      let idx = 0;
      result[key] = [...periodMap.entries()].sort((a, b) => a[0] - b[0]).map(([, vals]) => {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        return { period: idx++, value: avg, retention: vals.length / initialCount };
      });
    }
    this.safeEmit('data.cohort.completed', { cohortCount: Object.keys(result).length });
    return result;
  }

  // GAP-02: Retention analysis
  retentionAnalysis(_tenantId: string, data: DataRow[], userField: string, dateField: string): { retentionMatrix: number[][]; periods: string[]; overallRetention: number } {
    const userFirstSeen = new BoundedMap<string, number>(10_000);
    const userActive = new Map<string, Set<number>>();
    for (const row of data) {
      const user = String(row[userField]);
      const period = new Date(String(row[dateField])).getFullYear() * 12 + new Date(String(row[dateField])).getMonth();
      if (!userFirstSeen.has(user) || period < userFirstSeen.get(user)!) userFirstSeen.set(user, period);
      if (!userActive.has(user)) userActive.set(user, new Set());
      userActive.get(user)!.add(period);
    }
    const allPeriods = [...new Set(userFirstSeen.values())].sort((a, b) => a - b);
    const matrix: number[][] = [];
    for (const sp of allPeriods) {
      const cohort = [...userFirstSeen.entries()].filter(([, p]) => p === sp).map(([u]) => u);
      const row = [cohort.length];
      for (let off = 1; off <= 6; off++) row.push(cohort.length > 0 ? cohort.reduce((cnt, u) => cnt + (userActive.get(u)?.has(sp + off) ? 1 : 0), 0) / cohort.length : 0);
      matrix.push(row);
    }
    return { retentionMatrix: matrix, periods: allPeriods.map(p => `${Math.floor(p / 12)}-${String(p % 12 + 1).padStart(2, '0')}`), overallRetention: matrix.length > 0 ? matrix.reduce((s, r) => s + (r[1] || 0), 0) / matrix.length : 0 };
  }


  // Section 2.2: Aggregation suggestion
  suggestAggregationLogic(data: DataRow[], columns: string[]): Array<{ field: string; suggestedAggregation: string; reason: string }> {
    const suggestions: Array<{ field: string; suggestedAggregation: string; reason: string }> = [];
    for (const col of columns) {
      const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined);
      if (values.length === 0) continue;
      const isNumeric = values.every(v => typeof v === 'number');
      const uniqueRatio = new Set(values.map(String)).size / values.length;
      if (isNumeric) {
        const lc = col.toLowerCase();
        if (lc.includes('count') || lc.includes('عدد')) suggestions.push({ field: col, suggestedAggregation: 'SUM', reason: 'Count-like field' });
        else if (lc.includes('rate') || lc.includes('نسبة')) suggestions.push({ field: col, suggestedAggregation: 'AVG', reason: 'Rate field' });
        else suggestions.push({ field: col, suggestedAggregation: 'SUM', reason: 'Numeric field' });
      } else if (uniqueRatio < 0.3) suggestions.push({ field: col, suggestedAggregation: 'GROUP_BY', reason: 'Low cardinality' });
      else suggestions.push({ field: col, suggestedAggregation: 'COUNT', reason: 'High cardinality' });
    }
    return suggestions;
  }

  // Section 2.4: Query optimizer (FIX A1: uses class-level singleton)
  optimizeQuery(query: { tables: string[]; joins: number; conditions: number; aggregations: number; estimatedRows: number; indexes: number }, preference: 'speed' | 'accuracy' | 'balanced' = 'balanced'): unknown {
    const optimized = this.queryOptimizer.optimize(query);
    const costEstimate = this.queryOptimizer.estimateDetailedCost(query);
    const tradeoff = this.queryOptimizer.balanceSpeedAccuracy(query, preference);
    this.safeEmit('data.query.optimized', { tables: query.tables, strategy: tradeoff.strategy });
    return { optimized, costEstimate, tradeoff };
  }

  private inferFieldType(values: unknown[]): 'string' | 'number' | 'date' {
    const nonNull = values.filter(v => v != null && v !== '');
    if (nonNull.length === 0) return 'string';
    // FIX A6: Replace filter().length with reduce count
    const numericCount = nonNull.reduce((c, v) => c + (!isNaN(Number(v)) ? 1 : 0), 0);
    if (numericCount / nonNull.length > 0.8) return 'number';
    const dateCount = nonNull.reduce((c, v) => c + (!isNaN(Date.parse(String(v))) ? 1 : 0), 0);
    if (dateCount / nonNull.length > 0.6) return 'date';
    return 'string';
  }

  // === GAP-14 FIX: Anomaly Detection Engine ===

  /**
   * Detect anomalies in time-series data using multiple methods:
   * 1. Z-Score (statistical): flags values > 3 standard deviations from mean
   * 2. IQR (interquartile range): flags values outside Q1 - 1.5*IQR / Q3 + 1.5*IQR
   * 3. Moving Average deviation: flags values deviating >2σ from rolling window
   * 4. Rate of Change: flags sudden spikes/drops exceeding threshold
   */
  detectAnomalies(tenantId: string, data: DataRow[], targetField: string, options: {
    method?: 'zscore' | 'iqr' | 'moving_average' | 'rate_of_change' | 'ensemble';
    sensitivity?: number; // 0-1, default 0.5
    windowSize?: number; // for moving average, default 7
  } = {}): {
    anomalies: Array<{ index: number; value: number; score: number; method: string; direction: 'high' | 'low' | 'spike' }>;
    summary: { total: number; highCount: number; lowCount: number; spikeCount: number; anomalyRate: number };
    thresholds: { upper: number; lower: number; mean: number; stdDev: number };
  } {
    const values = data.map(r => r[targetField]).filter((v): v is number => typeof v === 'number');
    if (values.length < 5) return { anomalies: [], summary: { total: 0, highCount: 0, lowCount: 0, spikeCount: 0, anomalyRate: 0 }, thresholds: { upper: 0, lower: 0, mean: 0, stdDev: 0 } };

    const method = options.method || 'ensemble';
    const sensitivity = options.sensitivity ?? 0.5;
    const windowSize = options.windowSize ?? 7;

    // Statistics
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    // Threshold multiplier based on sensitivity (lower sensitivity = wider band = fewer anomalies)
    const zThreshold = 3 - sensitivity * 1.5; // 1.5 to 3.0
    const iqrMultiplier = 1.5 + (1 - sensitivity); // 1.5 to 2.5

    const anomalies: Array<{ index: number; value: number; score: number; method: string; direction: 'high' | 'low' | 'spike' }> = [];
    const seen = new Set<number>();

    const addAnomaly = (idx: number, val: number, score: number, m: string, dir: 'high' | 'low' | 'spike') => {
      if (!seen.has(idx)) {
        seen.add(idx);
        anomalies.push({ index: idx, value: val, score: Math.min(1, score), method: m, direction: dir });
      }
    };

    // Method 1: Z-Score
    if (method === 'zscore' || method === 'ensemble') {
      for (let i = 0; i < values.length; i++) {
        const z = stdDev > 0 ? Math.abs(values[i] - mean) / stdDev : 0;
        if (z > zThreshold) {
          addAnomaly(i, values[i], z / 5, 'zscore', values[i] > mean ? 'high' : 'low');
        }
      }
    }

    // Method 2: IQR
    if (method === 'iqr' || method === 'ensemble') {
      const lower = q1 - iqrMultiplier * iqr;
      const upper = q3 + iqrMultiplier * iqr;
      for (let i = 0; i < values.length; i++) {
        if (values[i] < lower) addAnomaly(i, values[i], (lower - values[i]) / (iqr || 1), 'iqr', 'low');
        if (values[i] > upper) addAnomaly(i, values[i], (values[i] - upper) / (iqr || 1), 'iqr', 'high');
      }
    }

    // Method 3: Moving Average
    if (method === 'moving_average' || method === 'ensemble') {
      for (let i = windowSize; i < values.length; i++) {
        const window = values.slice(i - windowSize, i);
        const wMean = window.reduce((s, v) => s + v, 0) / windowSize;
        const wStd = Math.sqrt(window.reduce((s, v) => s + (v - wMean) ** 2, 0) / windowSize);
        const deviation = wStd > 0 ? Math.abs(values[i] - wMean) / wStd : 0;
        if (deviation > 2) {
          addAnomaly(i, values[i], deviation / 4, 'moving_average', values[i] > wMean ? 'high' : 'low');
        }
      }
    }

    // Method 4: Rate of Change
    if (method === 'rate_of_change' || method === 'ensemble') {
      for (let i = 1; i < values.length; i++) {
        const prev = values[i - 1];
        if (prev !== 0) {
          const roc = Math.abs(values[i] - prev) / Math.abs(prev);
          const rocThreshold = 0.5 - sensitivity * 0.3; // 0.2 to 0.5
          if (roc > rocThreshold) {
            addAnomaly(i, values[i], roc, 'rate_of_change', 'spike');
          }
        }
      }
    }

    // Sort by score descending
    anomalies.sort((a, b) => b.score - a.score);

    const highCount = anomalies.reduce((c, a) => c + (a.direction === 'high' ? 1 : 0), 0);
    const lowCount = anomalies.reduce((c, a) => c + (a.direction === 'low' ? 1 : 0), 0);
    const spikeCount = anomalies.reduce((c, a) => c + (a.direction === 'spike' ? 1 : 0), 0);

    this.safeEmit('data.anomaly.detected', { tenantId, anomalyCount: anomalies.length, method });

    return {
      anomalies,
      summary: {
        total: anomalies.length,
        highCount, lowCount, spikeCount,
        anomalyRate: anomalies.length / values.length,
      },
      thresholds: {
        upper: mean + zThreshold * stdDev,
        lower: mean - zThreshold * stdDev,
        mean, stdDev,
      },
    };
  }

  /**
   * GAP-14: Trend decomposition — separate signal from noise
   */
  decomposeTrend(data: DataRow[], field: string, period: number = 12): {
    trend: number[];
    seasonal: number[];
    residual: number[];
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  } {
    const values = data.map(r => r[field]).filter((v): v is number => typeof v === 'number');
    if (values.length < period * 2) return { trend: values, seasonal: values.map(() => 0), residual: values.map(() => 0), trendDirection: 'stable' };

    // Simple moving average for trend
    const trend: number[] = [];
    const halfPeriod = Math.floor(period / 2);
    for (let i = 0; i < values.length; i++) {
      if (i < halfPeriod || i >= values.length - halfPeriod) {
        trend.push(values[i]);
      } else {
        const window = values.slice(i - halfPeriod, i + halfPeriod + 1);
        trend.push(window.reduce((s, v) => s + v, 0) / window.length);
      }
    }

    // Seasonal = detrended values averaged by period position
    const detrended = values.map((v, i) => v - trend[i]);
    const seasonalAvg: number[] = new Array(period).fill(0);
    const seasonalCount: number[] = new Array(period).fill(0);
    for (let i = 0; i < detrended.length; i++) {
      const pos = i % period;
      seasonalAvg[pos] += detrended[i];
      seasonalCount[pos]++;
    }
    for (let i = 0; i < period; i++) seasonalAvg[i] /= seasonalCount[i] || 1;
    const seasonal = values.map((_, i) => seasonalAvg[i % period]);

    // Residual = original - trend - seasonal
    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    // Trend direction
    const firstQuarter = trend.slice(0, Math.floor(trend.length / 4));
    const lastQuarter = trend.slice(Math.floor(trend.length * 3 / 4));
    const firstAvg = firstQuarter.reduce((s, v) => s + v, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((s, v) => s + v, 0) / lastQuarter.length;
    const change = (lastAvg - firstAvg) / (Math.abs(firstAvg) || 1);
    const trendDirection: 'increasing' | 'decreasing' | 'stable' = change > 0.05 ? 'increasing' : change < -0.05 ? 'decreasing' : 'stable';

    return { trend, seasonal, residual, trendDirection };
  }

  private detectPrimaryKeys(headers: string[], data: unknown[][]): string[] {
    for (const h of headers) {
      const idx = headers.indexOf(h);
      const values = data.map(r => (r as unknown[])[idx]);
      const unique = new Set(values.map(String));
      if (unique.size === data.length && !values.some(v => v == null)) return [h];
    }
    return headers.length > 0 ? [headers[0]] : [];
  }
}
