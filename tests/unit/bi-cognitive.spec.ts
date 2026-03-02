// D2 FIX: Unit tests for BI Cognitive Service
import { BiCognitiveService } from '../../modules/bi-cognitive/application/services/bi_cognitive.service';

describe('BiCognitiveService', () => {
  let service: BiCognitiveService;
  const mockRepo = { find: jest.fn(), save: jest.fn() } as any;
  const mockEvents = { emit: jest.fn() } as any;

  beforeEach(() => {
    service = new BiCognitiveService(mockRepo, mockEvents);
  });

  describe('analyzeDashboard', () => {
    it('should detect crowding when >6 charts', () => {
      const result = service.analyzeDashboard('t1', {
        charts: Array(8).fill({ id: 'c', type: 'bar' }),
        kpis: [], filters: [], width: 1920, height: 1080,
      });
      expect(result.insights.some(i => i.type === 'crowding')).toBe(true);
    });

    it('should suggest bar chart for tables with many rows', () => {
      const result = service.analyzeDashboard('t1', {
        charts: [{ id: 'c1', type: 'table', dataPoints: 20 }],
        kpis: [], filters: [], width: 1920, height: 1080,
      });
      expect(result.suggestedVisualizations[0]?.suggested).toBe('bar_chart');
    });
  });

  describe('detectSuddenChanges', () => {
    it('should detect spikes', () => {
      const values = [10, 11, 10, 12, 50, 10];
      const alerts = service.detectSuddenChanges('t1', 'metric', values);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('spike');
    });

    it('should link to related field causes', () => {
      const values = [10, 10, 50];
      const related = { traffic: [100, 100, 500] };
      const alerts = service.detectSuddenChanges('t1', 'sales', values, related);
      expect(alerts[0].probableCause).toContain('traffic');
    });
  });

  describe('detectCrossPatterns', () => {
    it('should find shared metrics across dashboards', () => {
      const result = service.detectCrossPatterns('t1', [
        { id: 'd1', metrics: { revenue: [1, 2, 3], users: [10, 20, 30] } },
        { id: 'd2', metrics: { revenue: [1, 2, 4], costs: [5, 6, 7] } },
      ]);
      expect(result.sharedMetrics).toContain('revenue');
    });
  });
});
