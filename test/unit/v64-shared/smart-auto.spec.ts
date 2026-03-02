import { SmartAutoEngine } from '../../../shared/smart-auto/index';

describe('SmartAutoEngine', () => {
  let engine: SmartAutoEngine;
  beforeEach(() => { engine = new SmartAutoEngine(); });

  it('should select STRICT for high complexity', () => {
    const plan = engine.createPlan({ tenantId: 't1', inputType: 'image', complexity: 0.9, arabicContent: false, elementCount: 150 });
    expect(plan.mode).toBe('STRICT');
  });

  it('should select HYBRID for Arabic content', () => {
    const plan = engine.createPlan({ tenantId: 't1', inputType: 'pdf', complexity: 0.6, arabicContent: true, elementCount: 50 });
    expect(plan.mode).toBe('HYBRID');
  });

  it('should select PROFESSIONAL for simple content', () => {
    const plan = engine.createPlan({ tenantId: 't1', inputType: 'doc', complexity: 0.3, arabicContent: false, elementCount: 20 });
    expect(plan.mode).toBe('PROFESSIONAL');
  });
});
