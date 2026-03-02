// Rasid v6.4 — Circuit Breaker Tests — D2 Fix
import { CircuitBreaker } from '../shared/circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker(3, 1000, 2); // 3 failures, 1s reset, 2 half-open attempts
  });

  it('should start in CLOSED state', () => {
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should execute successfully when CLOSED', async () => {
    const result = await cb.execute(async () => 42);
    expect(result).toBe(42);
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should transition to OPEN after threshold failures', async () => {
    const failFn = async () => { throw new Error('fail'); };
    for (let i = 0; i < 3; i++) {
      try { await cb.execute(failFn); } catch (e) {}
    }
    expect(cb.getState()).toBe('OPEN');
  });

  it('should use fallback when OPEN', async () => {
    const failFn = async () => { throw new Error('fail'); };
    for (let i = 0; i < 3; i++) {
      try { await cb.execute(failFn); } catch (e) {}
    }
    const result = await cb.execute(failFn, async () => 'fallback');
    expect(result).toBe('fallback');
  });

  it('should reset on manual reset()', () => {
    cb.reset();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getFailureCount()).toBe(0);
  });
});
