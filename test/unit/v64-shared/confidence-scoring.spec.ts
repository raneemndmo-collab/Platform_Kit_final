import { ConfidenceScoringEngine } from '../../../shared/confidence-scoring/index';

describe('ConfidenceScoringEngine', () => {
  let engine: ConfidenceScoringEngine;
  beforeEach(() => { engine = new ConfidenceScoringEngine(); });

  it('should auto-lock high confidence elements', () => {
    const result = engine.score({ id: 'e1', ocrConfidence: 0.99, layoutStability: 0.99, constraintCoherence: 0.99, dataInference: 0.99 });
    expect(result.status).toBe('auto_lock');
    expect(result.score).toBeGreaterThanOrEqual(0.98);
  });

  it('should flag low confidence elements', () => {
    const result = engine.score({ id: 'e2', ocrConfidence: 0.5, layoutStability: 0.5, constraintCoherence: 0.5, dataInference: 0.5 });
    expect(result.status).toBe('flagged');
  });
});
