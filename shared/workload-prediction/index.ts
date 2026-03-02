// Rasid v6.4 — Workload Prediction Engine — Section 8.2
import { Injectable, Logger } from '@nestjs/common';

export interface WorkloadPrediction {
  estimatedLoad: number; peakTime: Date;
  recommendedResources: { cpu: number; memory: number; gpu: boolean };
  preWarmTargets: string[]; confidence: number;
}

@Injectable()
export class WorkloadPredictionEngine {
  private readonly logger = new Logger(WorkloadPredictionEngine.name);
  private history: Array<{ timestamp: Date; load: number }> = [];

  record(load: number): void {
    this.history.push({ timestamp: new Date(), load });
    if (this.history.length > 1000) this.history = this.history.slice(-500);
  }

  predict(horizonMinutes: number = 60): WorkloadPrediction {
    if (this.history.length < 10) {
      return { estimatedLoad: 0.5, peakTime: new Date(Date.now() + horizonMinutes * 60000), recommendedResources: { cpu: 2, memory: 4096, gpu: false }, preWarmTargets: [], confidence: 0.3 };
    }

    const recent = this.history.slice(-50);
    const values = recent.map(h => h.load);
    const trend = this.linearTrend(values);
    const predicted = Math.max(0, Math.min(1, values[values.length - 1] + trend * (horizonMinutes / 5)));

    const peakIdx = values.indexOf(Math.max(...values));
    const peakOffset = (values.length - peakIdx) * 5;
    const peakTime = new Date(Date.now() + Math.max(0, horizonMinutes - peakOffset) * 60000);

    return {
      estimatedLoad: predicted, peakTime,
      recommendedResources: { cpu: predicted > 0.7 ? 8 : 4, memory: predicted > 0.7 ? 16384 : 8192, gpu: predicted > 0.8 },
      preWarmTargets: predicted > 0.6 ? ['columnar_cache', 'aggregation_cache', 'layout_cache'] : [],
      confidence: Math.min(0.95, 0.5 + this.history.length * 0.001),
    };
  }

  private linearTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (values[i] - yMean); den += (i - xMean) ** 2; }
    return den !== 0 ? num / den : 0;
  }

// GAP-24: Pre-warm targets based on prediction
  getPreWarmTargets(prediction: { predictedLoad: number }): string[] {
    if (prediction.predictedLoad > 0.8) return ['query_cache', 'aggregation_cache', 'gpu_model', 'columnar_hot'];
    if (prediction.predictedLoad > 0.6) return ['query_cache', 'aggregation_cache'];
    if (prediction.predictedLoad > 0.4) return ['query_cache'];
    return [];
  }

  // GAP-24: Proactive load distribution
  proactiveDistribution(predictedLoad: number, currentNodes: number): { action: 'none' | 'scale_up' | 'rebalance'; targetNodes: number; reason: string } {
    const loadPerNode = predictedLoad / Math.max(currentNodes, 1);
    if (loadPerNode > 0.85) return { action: 'scale_up', targetNodes: Math.ceil(currentNodes * 1.5), reason: `Predicted load ${(predictedLoad * 100).toFixed(0)}% exceeds per-node capacity` };
    if (loadPerNode > 0.6 && currentNodes > 1) return { action: 'rebalance', targetNodes: currentNodes, reason: 'Load approaching threshold — rebalancing recommended' };
    return { action: 'none', targetNodes: currentNodes, reason: 'Load within acceptable range' };
  }

  // GAP-29 FIX: Workload prediction with seasonality detection
  predictWithSeasonality(historicalLoad: number[], horizonPeriods: number = 5): {
    predictions: number[];
    seasonalPattern: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  } {
    const n = historicalLoad.length;
    if (n < 4) return { predictions: Array(horizonPeriods).fill(historicalLoad[n-1] || 0), seasonalPattern: [], trend: 'stable', confidence: 0.3 };
    
    // Simple moving average trend
    const mean = historicalLoad.reduce((s, v) => s + v, 0) / n;
    const firstHalf = historicalLoad.slice(0, Math.floor(n/2));
    const secondHalf = historicalLoad.slice(Math.floor(n/2));
    const firstMean = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const trend = secondMean > firstMean * 1.1 ? 'increasing' : secondMean < firstMean * 0.9 ? 'decreasing' : 'stable';
    
    // Detect seasonality (period = 7 for weekly)
    const period = Math.min(7, Math.floor(n / 2));
    const seasonal = Array(period).fill(0);
    const counts = Array(period).fill(0);
    for (let i = 0; i < n; i++) {
      seasonal[i % period] += historicalLoad[i] - mean;
      counts[i % period]++;
    }
    const seasonalPattern = seasonal.map((s, i) => counts[i] > 0 ? s / counts[i] : 0);
    
    // Predict
    const slope = (secondMean - firstMean) / Math.floor(n / 2);
    const predictions = Array.from({ length: horizonPeriods }, (_, i) => {
      const base = historicalLoad[n - 1] + slope * (i + 1);
      const seasonalAdj = seasonalPattern[(n + i) % period] || 0;
      return Math.max(0, base + seasonalAdj);
    });
    
    return { predictions, seasonalPattern, trend, confidence: Math.min(0.9, 0.5 + n * 0.02) };
  }
}
