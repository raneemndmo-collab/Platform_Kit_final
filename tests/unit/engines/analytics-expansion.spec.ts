// اختبارات وحدة — توسيع محرك التحليلات
import { AnalyticsExpansionEngine, DataPoint } from '../../../shared/engines/analytics-engine/analytics-expansion';

describe('AnalyticsExpansionEngine', () => {
  let engine: AnalyticsExpansionEngine;

  beforeEach(() => {
    engine = new AnalyticsExpansionEngine();
  });

  const generateDataPoints = (values: number[]): DataPoint[] =>
    values.map((v, i) => ({ timestamp: new Date(Date.now() - (values.length - i) * 86400000), value: v }));

  describe('Predictions', () => {
    it('should predict with linear regression', () => {
      const data = generateDataPoints([10, 20, 30, 40, 50]);
      const result = engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'score',
        historicalData: data, horizonPeriods: 3, confidenceLevel: 0.95, method: 'linear',
      });
      expect(result.predictions).toHaveLength(3);
      expect(result.predictions[0].predicted).toBeGreaterThan(50);
      expect(result.trend).toBe('upward');
      expect(result.accuracy).toBeGreaterThan(0);
    });

    it('should predict with exponential smoothing', () => {
      const data = generateDataPoints([50, 55, 53, 58, 60]);
      const result = engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'revenue',
        historicalData: data, horizonPeriods: 2, confidenceLevel: 0.95, method: 'exponential_smoothing',
      });
      expect(result.predictions).toHaveLength(2);
      expect(result.method).toBe('exponential_smoothing');
    });

    it('should predict with moving average', () => {
      const data = generateDataPoints([100, 105, 98, 102, 110, 108]);
      const result = engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'users',
        historicalData: data, horizonPeriods: 4, confidenceLevel: 0.95, method: 'moving_average',
      });
      expect(result.predictions).toHaveLength(4);
    });

    it('should predict with weighted average', () => {
      const data = generateDataPoints([20, 25, 30, 35, 40]);
      const result = engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'growth',
        historicalData: data, horizonPeriods: 2, confidenceLevel: 0.95, method: 'weighted_average',
      });
      expect(result.predictions).toHaveLength(2);
    });

    it('should throw for insufficient data', () => {
      const data = generateDataPoints([10, 20]);
      expect(() => engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'x',
        historicalData: data, horizonPeriods: 1, confidenceLevel: 0.95, method: 'linear',
      })).toThrow('Minimum 3 data points');
    });

    it('should detect volatile trend', () => {
      const data = generateDataPoints([10, 90, 15, 85, 20, 80, 25, 75]);
      const result = engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'volatile',
        historicalData: data, horizonPeriods: 2, confidenceLevel: 0.95, method: 'linear',
      });
      expect(result.trend).toBe('volatile');
    });

    it('should include confidence intervals', () => {
      const data = generateDataPoints([50, 52, 48, 55, 51]);
      const result = engine.predict({
        tenantId: 'T1', entityId: 'E1', metric: 'ci',
        historicalData: data, horizonPeriods: 2, confidenceLevel: 0.95, method: 'linear',
      });
      for (const p of result.predictions) {
        expect(p.lower).toBeLessThanOrEqual(p.predicted);
        expect(p.upper).toBeGreaterThanOrEqual(p.predicted);
      }
    });
  });

  describe('Trend Forecast', () => {
    it('should forecast upward trend', () => {
      const data = generateDataPoints([10, 20, 30, 40, 50, 60]);
      const forecast = engine.forecastTrend('T1', 'growth', data);
      expect(forecast.direction).toBe('up');
      expect(forecast.projectedValue).toBeGreaterThan(60);
      expect(forecast.changePercent).toBeGreaterThan(0);
    });

    it('should forecast downward trend', () => {
      const data = generateDataPoints([100, 90, 80, 70, 60, 50]);
      const forecast = engine.forecastTrend('T1', 'decline', data);
      expect(forecast.direction).toBe('down');
      expect(forecast.riskFactors.length).toBeGreaterThan(0);
    });

    it('should detect breakpoints', () => {
      const data = generateDataPoints([10, 20, 30, 20, 10, 20, 30]);
      const forecast = engine.forecastTrend('T1', 'breakpoint', data);
      expect(forecast.breakpoints.length).toBeGreaterThan(0);
    });
  });

  describe('Sector Analysis', () => {
    it('should analyze sector with ranking', () => {
      const entities = [
        { entityId: 'T1', entityName: 'Org1', metrics: { score: 80, compliance: 90 } },
        { entityId: 'T2', entityName: 'Org2', metrics: { score: 70, compliance: 75 } },
        { entityId: 'T3', entityName: 'Org3', metrics: { score: 90, compliance: 95 } },
      ];
      const analysis = engine.analyzeSector('T1', 'banking', entities, { start: new Date(), end: new Date() });
      expect(analysis.ranking.totalEntities).toBe(3);
      expect(analysis.metrics.length).toBe(2);
      expect(analysis.peerComparison.length).toBe(2);
    });

    it('should generate insights for below-average metrics', () => {
      const entities = [
        { entityId: 'T1', entityName: 'Org1', metrics: { score: 30 } },
        { entityId: 'T2', entityName: 'Org2', metrics: { score: 80 } },
        { entityId: 'T3', entityName: 'Org3', metrics: { score: 90 } },
      ];
      const analysis = engine.analyzeSector('T1', 'insurance', entities, { start: new Date(), end: new Date() });
      const opportunities = analysis.insights.filter(i => i.type === 'opportunity');
      expect(opportunities.length).toBeGreaterThan(0);
    });
  });
});
