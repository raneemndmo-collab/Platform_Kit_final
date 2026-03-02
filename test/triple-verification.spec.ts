// Rasid v6.4 — Triple Verification Tests — D2/GAP-07 Fix
import { TripleVerificationGate } from '../shared/triple-verification/rejection-logic';

describe('TripleVerificationGate', () => {
  let gate: TripleVerificationGate;

  beforeEach(() => {
    gate = new TripleVerificationGate();
  });

  it('should PASS when all checks within thresholds', () => {
    const result = gate.verify(0.0005, 0.9995, 0.9995);
    expect(result.verdict).toBe('PASS');
    expect(result.failedChecks.length).toBe(0);
  });

  it('should REJECT when pixel diff exceeds threshold', () => {
    const result = gate.verify(0.01, 0.9999, 0.9999);
    expect(result.verdict).toBe('REJECT');
    expect(result.failedChecks.length).toBeGreaterThan(0);
  });

  it('should REJECT when ANY single check fails', () => {
    // GAP-07: Deterministic rejection
    const result = gate.verify(0.0001, 0.998, 0.9999);
    expect(result.verdict).toBe('REJECT');
  });

  it('should batch verify multiple elements', () => {
    const batch = gate.verifyBatch([
      { id: 'el1', pixelDiff: 0.0001, structural: 0.9999, spatial: 0.9999 },
      { id: 'el2', pixelDiff: 0.01, structural: 0.99, spatial: 0.99 },
    ]);
    expect(batch.overallVerdict).toBe('REJECT'); // One element failed
    expect(batch.passRate).toBe(0.5);
  });
});
