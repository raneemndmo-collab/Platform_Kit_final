// ═══════════════════════════════════════════════════════════════════════════════
// توسيع محرك التحليلات — Analytics Engine Expansion
// رصيد v6.4 — تحليلات تنبؤية + توقعات اتجاه + تحليل قطاعي مقارن
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

// ─── تحليلات تنبؤية ─────────────────────────────────────────────────────────
export interface PredictionRequest {
  tenantId: string;
  entityId: string;
  metric: string;
  historicalData: DataPoint[];
  horizonPeriods: number;
  confidenceLevel: number;
  method: 'linear' | 'exponential_smoothing' | 'moving_average' | 'weighted_average';
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface PredictionResult {
  tenantId: string;
  entityId: string;
  metric: string;
  method: string;
  predictions: PredictedPoint[];
  accuracy: number;
  confidenceInterval: { lower: number; upper: number };
  trend: 'upward' | 'downward' | 'stable' | 'volatile';
  seasonality: boolean;
  generatedAt: Date;
}

export interface PredictedPoint {
  timestamp: Date;
  predicted: number;
  lower: number;
  upper: number;
  confidence: number;
}

// ─── توقعات الاتجاه ─────────────────────────────────────────────────────────
export interface TrendForecast {
  tenantId: string;
  metric: string;
  currentValue: number;
  projectedValue: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  strength: 'strong' | 'moderate' | 'weak';
  breakpoints: Array<{ date: Date; value: number; event: string }>;
  riskFactors: string[];
  opportunities: string[];
}

// ─── تحليل قطاعي مقارن ──────────────────────────────────────────────────────
export interface SectorAnalysis {
  tenantId: string;
  sector: string;
  period: { start: Date; end: Date };
  metrics: SectorMetric[];
  ranking: SectorRanking;
  peerComparison: PeerComparison[];
  insights: SectorInsight[];
}

export interface SectorMetric {
  name: string;
  value: number;
  sectorAverage: number;
  sectorMedian: number;
  percentile: number;
  trend: 'above' | 'at' | 'below';
}

export interface SectorRanking {
  position: number;
  totalEntities: number;
  quartile: 1 | 2 | 3 | 4;
  percentile: number;
}

export interface PeerComparison {
  peerId: string;
  peerName: string;
  score: number;
  delta: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SectorInsight {
  type: 'opportunity' | 'risk' | 'benchmark' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
}

@Injectable()
export class AnalyticsExpansionEngine {
  private readonly logger = new Logger(AnalyticsExpansionEngine.name);
  private readonly predictionCache = new BoundedMap<string, PredictionResult>(1000);
  private readonly sectorCache = new BoundedMap<string, SectorAnalysis>(500);

  // ─── تحليلات تنبؤية ──────────────────────────────────────────────────
  predict(request: PredictionRequest): PredictionResult {
    const { tenantId, entityId, metric, historicalData, horizonPeriods, confidenceLevel, method } = request;

    if (historicalData.length < 3) {
      throw new Error('Minimum 3 data points required for prediction');
    }

    const values = historicalData.map(d => d.value);
    let predictions: PredictedPoint[];

    switch (method) {
      case 'linear':
        predictions = this.linearRegression(historicalData, horizonPeriods, confidenceLevel);
        break;
      case 'exponential_smoothing':
        predictions = this.exponentialSmoothing(historicalData, horizonPeriods, confidenceLevel);
        break;
      case 'moving_average':
        predictions = this.movingAverage(historicalData, horizonPeriods, confidenceLevel);
        break;
      case 'weighted_average':
        predictions = this.weightedAverage(historicalData, horizonPeriods, confidenceLevel);
        break;
      default:
        predictions = this.linearRegression(historicalData, horizonPeriods, confidenceLevel);
    }

    // حساب الدقة بناءً على الانحراف المعياري
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stddev / Math.abs(mean)) * 100 : 0;
    const accuracy = Math.max(0, Math.min(100, 100 - cv));

    // تحديد الاتجاه
    const firstThird = values.slice(0, Math.ceil(values.length / 3));
    const lastThird = values.slice(-Math.ceil(values.length / 3));
    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    const changePct = firstAvg !== 0 ? ((lastAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;

    let trend: PredictionResult['trend'] = 'stable';
    if (cv > 30) trend = 'volatile';
    else if (changePct > 5) trend = 'upward';
    else if (changePct < -5) trend = 'downward';

    const result: PredictionResult = {
      tenantId,
      entityId,
      metric,
      method,
      predictions,
      accuracy: Math.round(accuracy * 10) / 10,
      confidenceInterval: {
        lower: mean - 1.96 * stddev,
        upper: mean + 1.96 * stddev,
      },
      trend,
      seasonality: this.detectSeasonality(values),
      generatedAt: new Date(),
    };

    this.predictionCache.set(`${tenantId}:${entityId}:${metric}`, result);
    this.logger.log(`Prediction generated: ${metric} for ${entityId}, trend=${trend}, accuracy=${result.accuracy}%`);
    return result;
  }

  // ─── الانحدار الخطي ───────────────────────────────────────────────────
  private linearRegression(data: DataPoint[], horizon: number, confidence: number): PredictedPoint[] {
    const n = data.length;
    const values = data.map(d => d.value);
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const residuals = values.map((v, i) => v - (slope * i + intercept));
    const se = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2));
    const zScore = confidence >= 0.99 ? 2.576 : confidence >= 0.95 ? 1.96 : 1.645;

    const predictions: PredictedPoint[] = [];
    const lastDate = data[data.length - 1].timestamp;
    const interval = n > 1 ? data[1].timestamp.getTime() - data[0].timestamp.getTime() : 86400000;

    for (let i = 1; i <= horizon; i++) {
      const x = n - 1 + i;
      const predicted = slope * x + intercept;
      const margin = zScore * se * Math.sqrt(1 + 1 / n + Math.pow(x - xMean, 2) / denominator);
      predictions.push({
        timestamp: new Date(lastDate.getTime() + i * interval),
        predicted: Math.round(predicted * 100) / 100,
        lower: Math.round((predicted - margin) * 100) / 100,
        upper: Math.round((predicted + margin) * 100) / 100,
        confidence: confidence * 100,
      });
    }
    return predictions;
  }

  // ─── التنعيم الأسي ────────────────────────────────────────────────────
  private exponentialSmoothing(data: DataPoint[], horizon: number, confidence: number): PredictedPoint[] {
    const alpha = 0.3;
    const values = data.map(d => d.value);
    const smoothed: number[] = [values[0]];

    for (let i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    const residuals = values.map((v, i) => v - smoothed[i]);
    const se = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / values.length);
    const zScore = confidence >= 0.95 ? 1.96 : 1.645;

    const lastSmoothed = smoothed[smoothed.length - 1];
    const lastDate = data[data.length - 1].timestamp;
    const interval = data.length > 1 ? data[1].timestamp.getTime() - data[0].timestamp.getTime() : 86400000;

    const predictions: PredictedPoint[] = [];
    for (let i = 1; i <= horizon; i++) {
      const margin = zScore * se * Math.sqrt(i);
      predictions.push({
        timestamp: new Date(lastDate.getTime() + i * interval),
        predicted: Math.round(lastSmoothed * 100) / 100,
        lower: Math.round((lastSmoothed - margin) * 100) / 100,
        upper: Math.round((lastSmoothed + margin) * 100) / 100,
        confidence: confidence * 100,
      });
    }
    return predictions;
  }

  // ─── المتوسط المتحرك ──────────────────────────────────────────────────
  private movingAverage(data: DataPoint[], horizon: number, confidence: number): PredictedPoint[] {
    const windowSize = Math.min(5, data.length);
    const values = data.map(d => d.value);
    const lastWindow = values.slice(-windowSize);
    const avg = lastWindow.reduce((a, b) => a + b, 0) / windowSize;
    const se = Math.sqrt(lastWindow.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / windowSize);
    const zScore = confidence >= 0.95 ? 1.96 : 1.645;

    const lastDate = data[data.length - 1].timestamp;
    const interval = data.length > 1 ? data[1].timestamp.getTime() - data[0].timestamp.getTime() : 86400000;

    const predictions: PredictedPoint[] = [];
    for (let i = 1; i <= horizon; i++) {
      const margin = zScore * se * Math.sqrt(i / windowSize);
      predictions.push({
        timestamp: new Date(lastDate.getTime() + i * interval),
        predicted: Math.round(avg * 100) / 100,
        lower: Math.round((avg - margin) * 100) / 100,
        upper: Math.round((avg + margin) * 100) / 100,
        confidence: confidence * 100,
      });
    }
    return predictions;
  }

  // ─── المتوسط المرجح ───────────────────────────────────────────────────
  private weightedAverage(data: DataPoint[], horizon: number, confidence: number): PredictedPoint[] {
    const values = data.map(d => d.value);
    const n = values.length;
    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < n; i++) {
      const weight = i + 1;
      weightedSum += values[i] * weight;
      weightTotal += weight;
    }
    const wAvg = weightedSum / weightTotal;
    const se = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - wAvg, 2), 0) / n);
    const zScore = confidence >= 0.95 ? 1.96 : 1.645;

    const lastDate = data[data.length - 1].timestamp;
    const interval = n > 1 ? data[1].timestamp.getTime() - data[0].timestamp.getTime() : 86400000;

    const predictions: PredictedPoint[] = [];
    for (let i = 1; i <= horizon; i++) {
      const margin = zScore * se;
      predictions.push({
        timestamp: new Date(lastDate.getTime() + i * interval),
        predicted: Math.round(wAvg * 100) / 100,
        lower: Math.round((wAvg - margin) * 100) / 100,
        upper: Math.round((wAvg + margin) * 100) / 100,
        confidence: confidence * 100,
      });
    }
    return predictions;
  }

  // ─── كشف الموسمية ─────────────────────────────────────────────────────
  private detectSeasonality(values: number[]): boolean {
    if (values.length < 8) return false;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const detrended = values.map(v => v - mean);

    // اختبار autocorrelation عند lag = n/2
    const lag = Math.floor(n / 2);
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    for (let i = 0; i < n - lag; i++) {
      numerator += detrended[i] * detrended[i + lag];
      denom1 += detrended[i] * detrended[i];
      denom2 += detrended[i + lag] * detrended[i + lag];
    }
    const correlation = (denom1 > 0 && denom2 > 0) ? numerator / Math.sqrt(denom1 * denom2) : 0;
    return Math.abs(correlation) > 0.5;
  }

  // ─── توقعات الاتجاه ──────────────────────────────────────────────────
  forecastTrend(
    tenantId: string,
    metric: string,
    historicalData: DataPoint[],
  ): TrendForecast {
    const values = historicalData.map(d => d.value);
    const currentValue = values[values.length - 1] ?? 0;

    // حساب الاتجاه
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += Math.pow(i - xMean, 2);
    }
    const slope = den !== 0 ? num / den : 0;
    const projectedValue = Math.round((slope * (n + 3) + (yMean - slope * xMean)) * 100) / 100;
    const changePercent = currentValue !== 0 ? Math.round(((projectedValue - currentValue) / Math.abs(currentValue)) * 10000) / 100 : 0;

    const direction: TrendForecast['direction'] = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'flat';
    const absChange = Math.abs(changePercent);
    const strength: TrendForecast['strength'] = absChange > 15 ? 'strong' : absChange > 5 ? 'moderate' : 'weak';

    // كشف نقاط التحول
    const breakpoints: TrendForecast['breakpoints'] = [];
    for (let i = 1; i < values.length - 1; i++) {
      const prevDelta = values[i] - values[i - 1];
      const nextDelta = values[i + 1] - values[i];
      if ((prevDelta > 0 && nextDelta < 0) || (prevDelta < 0 && nextDelta > 0)) {
        breakpoints.push({
          date: historicalData[i].timestamp,
          value: values[i],
          event: prevDelta > 0 ? 'peak' : 'trough',
        });
      }
    }

    return {
      tenantId,
      metric,
      currentValue,
      projectedValue,
      changePercent,
      direction,
      strength,
      breakpoints,
      riskFactors: direction === 'down' ? ['Declining trend detected', 'Below average performance'] : [],
      opportunities: direction === 'up' ? ['Positive momentum', 'Above average growth'] : [],
    };
  }

  // ─── تحليل قطاعي مقارن ────────────────────────────────────────────────
  analyzeSector(
    tenantId: string,
    sector: string,
    entityMetrics: Array<{ entityId: string; entityName: string; metrics: Record<string, number> }>,
    period: { start: Date; end: Date },
  ): SectorAnalysis {
    const allMetricNames = new Set<string>();
    entityMetrics.forEach(e => Object.keys(e.metrics).forEach(m => allMetricNames.add(m)));

    const currentEntity = entityMetrics.find(e => e.entityId === tenantId);
    const sectorMetrics: SectorMetric[] = [];

    for (const metricName of allMetricNames) {
      const allValues = entityMetrics.map(e => e.metrics[metricName] ?? 0).sort((a, b) => a - b);
      const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
      const median = allValues.length % 2 === 0
        ? (allValues[allValues.length / 2 - 1] + allValues[allValues.length / 2]) / 2
        : allValues[Math.floor(allValues.length / 2)];
      const currentValue = currentEntity?.metrics[metricName] ?? 0;
      const rank = allValues.filter(v => v <= currentValue).length;
      const percentile = Math.round((rank / allValues.length) * 100);

      sectorMetrics.push({
        name: metricName,
        value: currentValue,
        sectorAverage: Math.round(avg * 100) / 100,
        sectorMedian: Math.round(median * 100) / 100,
        percentile,
        trend: currentValue > avg * 1.05 ? 'above' : currentValue < avg * 0.95 ? 'below' : 'at',
      });
    }

    // ترتيب الكيان
    const overallScores = entityMetrics.map(e => ({
      id: e.entityId,
      score: Object.values(e.metrics).reduce((a, b) => a + b, 0) / Object.values(e.metrics).length,
    })).sort((a, b) => b.score - a.score);

    const position = overallScores.findIndex(e => e.entityId === tenantId) + 1;
    const totalEntities = entityMetrics.length;
    const percentile = Math.round(((totalEntities - position + 1) / totalEntities) * 100);
    const quartile = (percentile > 75 ? 1 : percentile > 50 ? 2 : percentile > 25 ? 3 : 4) as 1 | 2 | 3 | 4;

    // مقارنة الأقران
    const peerComparison: PeerComparison[] = entityMetrics
      .filter(e => e.entityId !== tenantId)
      .slice(0, 5)
      .map(peer => {
        const peerAvg = Object.values(peer.metrics).reduce((a, b) => a + b, 0) / Object.values(peer.metrics).length;
        const currentAvg = currentEntity
          ? Object.values(currentEntity.metrics).reduce((a, b) => a + b, 0) / Object.values(currentEntity.metrics).length
          : 0;
        return {
          peerId: peer.entityId,
          peerName: peer.entityName,
          score: Math.round(peerAvg * 100) / 100,
          delta: Math.round((currentAvg - peerAvg) * 100) / 100,
          strengths: [],
          weaknesses: [],
        };
      });

    // رؤى قطاعية
    const insights: SectorInsight[] = [];
    for (const sm of sectorMetrics) {
      if (sm.trend === 'above') {
        insights.push({
          type: 'benchmark',
          title: `${sm.name}: Above sector average`,
          description: `Current value ${sm.value} exceeds sector average ${sm.sectorAverage}`,
          impact: 'medium',
          actionable: false,
        });
      } else if (sm.trend === 'below') {
        insights.push({
          type: 'opportunity',
          title: `${sm.name}: Below sector average`,
          description: `Current value ${sm.value} is below sector average ${sm.sectorAverage}`,
          impact: 'high',
          actionable: true,
          recommendation: `Improve ${sm.name} to reach at least sector median (${sm.sectorMedian})`,
        });
      }
    }

    const analysis: SectorAnalysis = {
      tenantId,
      sector,
      period,
      metrics: sectorMetrics,
      ranking: { position, totalEntities, quartile, percentile },
      peerComparison,
      insights,
    };

    this.sectorCache.set(`${tenantId}:${sector}`, analysis);
    this.logger.log(`Sector analysis: ${sector}, position=${position}/${totalEntities}, percentile=${percentile}`);
    return analysis;
  }
}
