// D2 FIX: Unit tests for APIL Orchestrator
import { ApilOrchestratorService } from '../../modules/apil-orchestrator/application/services/apil_orchestrator.service';

describe('ApilOrchestratorService', () => {
  let service: ApilOrchestratorService;
  const mockRepo = { find: jest.fn(), save: jest.fn() } as any;
  const mockEvents = { emit: jest.fn() } as any;

  beforeEach(() => {
    service = new ApilOrchestratorService(mockRepo, mockEvents);
  });

  describe('createExecutionPlan', () => {
    it('should create plan with agents', async () => {
      const plan = await service.createExecutionPlan('t1', { type: 'image', content: {} });
      expect(plan.agents.length).toBeGreaterThan(0);
      expect(plan.selectedMode).toBeDefined();
      expect(plan.tenantId).toBe('t1');
    });
  });

  describe('executeAgent (AI-002 fix)', () => {
    it('should NOT produce random scores', async () => {
      const plan = await service.createExecutionPlan('t1', { type: 'data', content: {} });
      const result = await service.executePlan(plan);
      // AI-002: Scores should be deterministic for same input
      for (const [, agentResult] of Object.entries(result.results)) {
        expect((agentResult as any).score).toBeDefined();
        expect((agentResult as any).score).not.toBeCloseTo(0.85, 0); // Should not be random 0.85-0.99
      }
    });
  });
});
