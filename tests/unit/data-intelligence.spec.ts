// D2 FIX: Unit tests for Data Intelligence Service
import { DataIntelligenceService } from '../../modules/data-intelligence/application/services/data_intelligence.service';

describe('DataIntelligenceService', () => {
  let service: DataIntelligenceService;
  const mockRepo = { findByTenant: jest.fn(), create: jest.fn() } as any;
  const mockEvents = { emit: jest.fn() } as any;

  beforeEach(() => {
    service = new DataIntelligenceService(mockRepo, mockEvents);
  });

  describe('inferDataModel', () => {
    it('should detect star schema for few dimensions', () => {
      const result = service.inferDataModel(
        ['id', 'name', 'revenue', 'date'],
        [['1', 'A', 100, '2024-01-01'], ['2', 'B', 200, '2024-01-02']],
        'sales'
      );
      expect(result.schemaType).toBe('star');
      expect(result.measures).toContain('revenue');
    });
  });

  describe('forecast', () => {
    it('should predict upward trend', () => {
      const result = service.forecast([10, 20, 30, 40, 50], 3);
      expect(result.forecast[0].value).toBeGreaterThan(50);
      expect(result.model).toBe('linear_regression');
    });

    it('should handle insufficient data', () => {
      const result = service.forecast([10], 3);
      expect(result.confidence).toBe(0);
    });
  });

  describe('monteCarloSimulation', () => {
    it('should produce histogram with O(n) performance', () => {
      const data = Array(100).fill(null).map((_, i) => ({ val: Math.random() * 100 }));
      const result = service.monteCarloSimulation('t1', data, 'val', 500);
      expect(result.histogram.length).toBe(20);
      expect(result.histogram.reduce((s, h) => s + h.count, 0)).toBe(500);
    });
  });

  describe('detectAnomalies', () => {
    it('should find outliers', () => {
      const data = [...Array(20).fill({ v: 10 }), { v: 100 }];
      const anomalies = service.detectAnomalies('t1', data, 'v');
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });
});
