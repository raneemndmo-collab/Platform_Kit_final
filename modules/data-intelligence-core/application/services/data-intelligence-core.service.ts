/**
 * SECTION 2: Advanced Data Intelligence Core
 * ────────────────────────────────────────────────────────
 * §2.1 Intelligent Data Modeling Engine
 * §2.2 Automatic Metric Derivation Engine
 */
import { Injectable, Logger } from '@nestjs/common';

interface ColumnProfile {
  name: string;
  inferredType: 'dimension' | 'measure' | 'temporal' | 'identifier' | 'metadata';
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  nullRatio: number;
  distinctRatio: number;
  isKey: boolean;
  isForeignKey: boolean;
  relatedTo?: string;
}

interface InferredSchema {
  type: 'star' | 'snowflake' | 'flat';
  factTable: string;
  dimensions: { table: string; column: string; hierarchy?: string[] }[];
  measures: { column: string; aggregation: string; unit?: string }[];
  temporalField?: string;
  confidence: number;
}

interface DerivedKPI {
  id: string;
  name: string;
  nameAr: string;
  formula: string;
  unit: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct' | 'ratio';
  dimensions: string[];
  importance: number;
  category: 'performance' | 'financial' | 'operational' | 'quality' | 'growth';
}

interface AnomalyResult {
  field: string;
  timestamp?: string;
  value: number;
  expectedRange: { lower: number; upper: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'trend_change' | 'seasonal_anomaly' | 'outlier';
  confidence: number;
}

@Injectable()
export class AdvancedDataIntelligenceService {
  private readonly logger = new Logger('DataIntelligence');

  // §2.1 — Intelligent Data Modeling
  inferDataModel(columns: string[], sampleData: Record<string, unknown>[]): InferredSchema {
    const profiles = columns.map(col => this.profileColumn(col, sampleData));
    const measures = profiles.filter(p => p.inferredType === 'measure');
    const dimensions = profiles.filter(p => p.inferredType === 'dimension');
    const temporal = profiles.find(p => p.inferredType === 'temporal');
    const keys = profiles.filter(p => p.isKey);

    // Detect schema type
    const hasForeignKeys = profiles.some(p => p.isForeignKey);
    const schemaType = hasForeignKeys ? (dimensions.length > 5 ? 'snowflake' : 'star') : 'flat';

    return {
      type: schemaType,
      factTable: keys.length > 0 ? 'fact_main' : 'data',
      dimensions: dimensions.map(d => ({
        table: `dim_${d.name}`,
        column: d.name,
        hierarchy: this.inferHierarchy(d.name, sampleData),
      })),
      measures: measures.map(m => ({
        column: m.name,
        aggregation: this.suggestAggregation(m, sampleData),
        unit: this.inferUnit(m.name),
      })),
      temporalField: temporal?.name,
      confidence: this.calculateModelConfidence(profiles),
    };
  }

  // §2.2 — Automatic Metric Derivation
  deriveKPIs(columns: string[], sampleData: Record<string, unknown>[]): DerivedKPI[] {
    const kpis: DerivedKPI[] = [];
    const profiles = columns.map(col => this.profileColumn(col, sampleData));
    const measures = profiles.filter(p => p.inferredType === 'measure');
    const dimensions = profiles.filter(p => p.inferredType === 'dimension');

    // Basic aggregation KPIs
    for (const m of measures) {
      kpis.push({
        id: `kpi_total_${m.name}`, name: `Total ${m.name}`,
        nameAr: `إجمالي ${m.name}`, formula: `SUM(${m.name})`,
        unit: this.inferUnit(m.name), aggregation: 'sum',
        dimensions: dimensions.slice(0, 3).map(d => d.name),
        importance: 0.8, category: 'performance',
      });
      kpis.push({
        id: `kpi_avg_${m.name}`, name: `Average ${m.name}`,
        nameAr: `متوسط ${m.name}`, formula: `AVG(${m.name})`,
        unit: this.inferUnit(m.name), aggregation: 'avg',
        dimensions: dimensions.slice(0, 3).map(d => d.name),
        importance: 0.7, category: 'performance',
      });
    }

    // Ratio KPIs between measures
    if (measures.length >= 2) {
      for (let i = 0; i < measures.length - 1; i++) {
        for (let j = i + 1; j < measures.length; j++) {
          const ratio = this.computeRatioRelevance(measures[i], measures[j]);
          if (ratio > 0.5) {
            kpis.push({
              id: `kpi_ratio_${measures[i].name}_${measures[j].name}`,
              name: `${measures[i].name}/${measures[j].name} Ratio`,
              nameAr: `نسبة ${measures[i].name} إلى ${measures[j].name}`,
              formula: `${measures[i].name} / ${measures[j].name}`,
              unit: '%', aggregation: 'ratio',
              dimensions: dimensions.slice(0, 2).map(d => d.name),
              importance: ratio, category: 'financial',
            });
          }
        }
      }
    }

    // Growth KPIs if temporal field exists
    const temporal = profiles.find(p => p.inferredType === 'temporal');
    if (temporal) {
      for (const m of measures.slice(0, 3)) {
        kpis.push({
          id: `kpi_growth_${m.name}`, name: `${m.name} Growth Rate`,
          nameAr: `معدل نمو ${m.name}`,
          formula: `(${m.name}_current - ${m.name}_previous) / ${m.name}_previous * 100`,
          unit: '%', aggregation: 'ratio', dimensions: [temporal.name],
          importance: 0.9, category: 'growth',
        });
      }
    }

    return kpis.sort((a, b) => b.importance - a.importance);
  }

  // Anomaly Detection
  detectAnomalies(data: Record<string, number>[], field: string): AnomalyResult[] {
    const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined);
    if (values.length < 10) return [];

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const anomalies: AnomalyResult[] = [];

    for (let i = 0; i < values.length; i++) {
      const zScore = Math.abs((values[i] - mean) / (stdDev || 1));
      if (zScore > 2.5) {
        anomalies.push({
          field,
          value: values[i],
          expectedRange: { lower: mean - 2 * stdDev, upper: mean + 2 * stdDev },
          severity: zScore > 4 ? 'critical' : zScore > 3.5 ? 'high' : zScore > 3 ? 'medium' : 'low',
          type: values[i] > mean ? 'spike' : 'drop',
          confidence: Math.min(0.99, 1 - 1 / (zScore * zScore)),
        });
      }
    }

    return anomalies;
  }

  // Trend Forecasting
  forecastTrend(values: number[], periods: number): { forecast: number[]; confidence: number } {
    if (values.length < 3) return { forecast: Array(periods).fill(values[values.length - 1] ?? 0), confidence: 0.1 };

    // Simple linear regression
    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((s, v) => s + v, 0);
    const sumXY = values.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = Array.from({ length: periods }, (_, i) => intercept + slope * (n + i));
    const residuals = values.map((v, i) => v - (intercept + slope * i));
    const rss = residuals.reduce((s, r) => s + r * r, 0);
    const tss = values.reduce((s, v) => s + (v - sumY / n) ** 2, 0);
    const rSquared = tss > 0 ? 1 - rss / tss : 0;

    return { forecast, confidence: Math.max(0, Math.min(1, rSquared)) };
  }

  // ─── Private Helpers ───
  private profileColumn(name: string, data: Record<string, unknown>[]): ColumnProfile {
    const values = data.map(d => d[name]).filter(v => v !== null && v !== undefined);
    const nullRatio = 1 - values.length / data.length;
    const distinct = new Set(values.map(String)).size;
    const distinctRatio = values.length > 0 ? distinct / values.length : 0;
    const isNumeric = values.every(v => typeof v === 'number' || !isNaN(Number(v)));
    const isDate = /date|time|created|updated|timestamp/i.test(name);
    const isId = /^id$|_id$|^uuid$|^key$/i.test(name);

    return {
      name,
      inferredType: isId ? 'identifier' : isDate ? 'temporal' : isNumeric && distinctRatio > 0.5 ? 'measure' : 'dimension',
      dataType: isDate ? 'date' : isNumeric ? 'number' : distinctRatio < 0.05 ? 'enum' : 'string',
      nullRatio,
      distinctRatio,
      isKey: isId || (distinctRatio === 1 && values.length > 0),
      isForeignKey: /_id$/i.test(name) && !(/^id$/i.test(name)),
    };
  }

  private inferHierarchy(name: string, data: Record<string, unknown>[]): string[] | undefined {
    if (/country|region|city/i.test(name)) return ['country', 'region', 'city'];
    if (/year|quarter|month/i.test(name)) return ['year', 'quarter', 'month', 'day'];
    if (/category|subcategory/i.test(name)) return ['category', 'subcategory'];
    return undefined;
  }

  private suggestAggregation(profile: ColumnProfile, data: Record<string, unknown>[]): string {
    if (/count|quantity|qty/i.test(profile.name)) return 'sum';
    if (/rate|ratio|percent|avg|average/i.test(profile.name)) return 'avg';
    if (/price|cost|revenue|amount|total/i.test(profile.name)) return 'sum';
    return 'sum';
  }

  private inferUnit(name: string): string {
    if (/price|cost|revenue|amount|budget/i.test(name)) return 'SAR';
    if (/percent|rate|ratio/i.test(name)) return '%';
    if (/count|quantity|qty|num/i.test(name)) return '#';
    if (/duration|time|latency/i.test(name)) return 'ms';
    if (/size|weight/i.test(name)) return 'MB';
    return '';
  }

  private computeRatioRelevance(a: ColumnProfile, b: ColumnProfile): number {
    if (a.inferredType !== 'measure' || b.inferredType !== 'measure') return 0;
    return 0.6;
  }

  private calculateModelConfidence(profiles: ColumnProfile[]): number {
    const hasKeys = profiles.some(p => p.isKey);
    const hasMeasures = profiles.some(p => p.inferredType === 'measure');
    const hasDimensions = profiles.some(p => p.inferredType === 'dimension');
    let confidence = 0.5;
    if (hasKeys) confidence += 0.15;
    if (hasMeasures) confidence += 0.15;
    if (hasDimensions) confidence += 0.1;
    if (profiles.some(p => p.inferredType === 'temporal')) confidence += 0.1;
    return Math.min(0.99, confidence);
  }
}
