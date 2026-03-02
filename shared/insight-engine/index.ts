// Rasid v6.4 — Real-Time Insight Engine — Section 4.1
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger } from '@nestjs/common';

export interface InsightResult {
  id: string; type: 'anomaly' | 'trend' | 'threshold' | 'correlation' | 'forecast';
  severity: 'info' | 'warning' | 'critical'; title: string; description: string;
  dataPoints: DataPoint[]; timestamp: Date; confidence: number;
  probableCause?: string; autoExplanation: string;
}

export interface DataPoint { metric: string; value: number; timestamp: Date; baseline?: number; }

@Injectable()
export class RealTimeInsightEngine {
  private readonly logger = new Logger(RealTimeInsightEngine.name);

  analyzeStream(dataPoints: DataPoint[], baselineWindow: number = 30): InsightResult[] {
    const insights: InsightResult[] = [];
    const grouped = this.groupByMetric(dataPoints);

    for (const [metric, points] of grouped) {
      const sorted = points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const anomalies = this.detectAnomalies(metric, sorted);
      const trends = this.detectTrends(metric, sorted);
      insights.push(...anomalies, ...trends);
    }
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  private detectAnomalies(metric: string, points: DataPoint[]): InsightResult[] {
    if (points.length < 5) return [];
    const values = points.map(p => p.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const results: InsightResult[] = [];

    for (const p of points) {
      const zScore = stdDev > 0 ? Math.abs(p.value - mean) / stdDev : 0;
      if (zScore > 2.5) {
        const direction = p.value > mean ? 'spike' : 'drop';
        results.push({
          id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'anomaly', severity: zScore > 3 ? 'critical' : 'warning',
          title: `${metric} ${direction} detected`, description: `Value ${p.value.toFixed(2)} deviates ${zScore.toFixed(1)}σ from mean ${mean.toFixed(2)}`,
          dataPoints: [p], timestamp: new Date(), confidence: Math.min(0.99, zScore / 4),
          probableCause: `Sudden ${direction} in ${metric}`,
          autoExplanation: `${metric} showed a significant ${direction} of ${((p.value - mean) / mean * 100).toFixed(1)}% from the baseline average.`,
        });
      }
    }
    return results;
  }

  private detectTrends(metric: string, points: DataPoint[]): InsightResult[] {
    if (points.length < 10) return [];
    const n = points.length;
    const xMean = (n - 1) / 2;
    const yMean = points.reduce((s, p) => s + p.value, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (points[i].value - yMean); den += (i - xMean) ** 2; }
    const slope = den !== 0 ? num / den : 0;
    const slopePercent = yMean !== 0 ? (slope / yMean) * 100 : 0;

    if (Math.abs(slopePercent) > 2) {
      const direction = slope > 0 ? 'upward' : 'downward';
      return [{
        id: `insight_trend_${Date.now()}`, type: 'trend', severity: Math.abs(slopePercent) > 10 ? 'warning' : 'info',
        title: `${metric} shows ${direction} trend`, description: `${direction} trend of ${slopePercent.toFixed(1)}% per period`,
        dataPoints: points.slice(-5), timestamp: new Date(), confidence: Math.min(0.95, Math.abs(slopePercent) / 20),
        autoExplanation: `${metric} has been consistently moving ${direction} over the last ${n} data points.`,
      }];
    }
    return [];
  }

  private groupByMetric(points: DataPoint[]): Map<string, DataPoint[]> {
    const map = new BoundedMap<string, DataPoint[]>(10_000);
    for (const p of points) {
      if (!map.has(p.metric)) map.set(p.metric, []);
      map.get(p.metric)!.push(p);
    }
    return map;
  }

// GAP-10: Auto-explanation generation — link change to probable cause
  generateExplanation(anomaly: { type: string; value: number; expectedRange: [number, number]; field: string; timestamp?: number }, context?: { relatedFields?: Record<string, number[]> }): { explanation: string; probableCause: string; confidence: number; relatedFactors: string[] } {
    const deviation = anomaly.value > anomaly.expectedRange[1]
      ? `${((anomaly.value / anomaly.expectedRange[1] - 1) * 100).toFixed(1)}% above expected maximum`
      : `${((1 - anomaly.value / anomaly.expectedRange[0]) * 100).toFixed(1)}% below expected minimum`;

    let probableCause = 'Unknown — requires further investigation';
    let confidence = 0.3;
    const relatedFactors: string[] = [];

    if (context?.relatedFields) {
      for (const [field, values] of Object.entries(context.relatedFields)) {
        if (values.length < 2) continue;
        const recent = values[values.length - 1];
        const prev = values[values.length - 2];
        const changePct = prev !== 0 ? Math.abs(recent - prev) / Math.abs(prev) : 0;
        if (changePct > 0.2) {
          relatedFactors.push(field);
          if (changePct > 0.4) {
            probableCause = `Correlated with ${(changePct * 100).toFixed(0)}% change in ${field}`;
            confidence = Math.min(0.85, 0.4 + changePct);
          }
        }
      }
    }

    if (anomaly.type === 'spike' && relatedFactors.length === 0) {
      probableCause = 'Sudden increase — possible data entry error or seasonal peak';
      confidence = 0.4;
    } else if (anomaly.type === 'drop' && relatedFactors.length === 0) {
      probableCause = 'Sudden decrease — possible system issue or external factor';
      confidence = 0.4;
    }

    return {
      explanation: `${anomaly.field} shows ${anomaly.type}: value ${anomaly.value} is ${deviation}`,
      probableCause, confidence, relatedFactors,
    };
  }
}
