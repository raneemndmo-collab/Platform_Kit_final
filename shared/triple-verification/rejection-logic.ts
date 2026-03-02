// Rasid v6.4 — Triple Verification Rejection Logic — GAP-07 Fix
import { Injectable, Logger } from '@nestjs/common';

export interface VerificationResult {
  pixelDiff: number;
  structuralSimilarity: number;
  spatialFidelity: number;
  verdict: 'PASS' | 'CONDITIONAL' | 'REJECT';
  failedChecks: string[];
  confidenceScore: number;
}

@Injectable()
export class TripleVerificationGate {
  private readonly logger = new Logger(TripleVerificationGate.name);
  
  private readonly THRESHOLDS = {
    pixelDiffMax: parseFloat(process.env['TV_PIXEL_MAX'] || '0.001'),
    structuralMin: parseFloat(process.env['TV_STRUCTURAL_MIN'] || '0.999'),
    spatialMin: parseFloat(process.env['TV_SPATIAL_MIN'] || '0.999'),
  };

  /**
   * GAP-07: Deterministic rejection — always reject if ANY check fails
   * GAP-01: Triple Verification with clear pass/fail logic
   */
  verify(pixelDiff: number, structuralSim: number, spatialFidelity: number): VerificationResult {
    const failedChecks: string[] = [];

    if (pixelDiff > this.THRESHOLDS.pixelDiffMax) {
      failedChecks.push(`pixel_diff=${pixelDiff.toFixed(6)} > ${this.THRESHOLDS.pixelDiffMax}`);
    }
    if (structuralSim < this.THRESHOLDS.structuralMin) {
      failedChecks.push(`structural=${structuralSim.toFixed(6)} < ${this.THRESHOLDS.structuralMin}`);
    }
    if (spatialFidelity < this.THRESHOLDS.spatialMin) {
      failedChecks.push(`spatial=${spatialFidelity.toFixed(6)} < ${this.THRESHOLDS.spatialMin}`);
    }

    const allPassed = failedChecks.length === 0;
    const confidenceScore = (
      (1 - Math.min(pixelDiff / this.THRESHOLDS.pixelDiffMax, 1)) * 0.33 +
      (structuralSim / this.THRESHOLDS.structuralMin) * 0.34 +
      (spatialFidelity / this.THRESHOLDS.spatialMin) * 0.33
    );

    // GAP-07: Deterministic — no probabilistic acceptance
    const verdict: VerificationResult['verdict'] = allPassed ? 'PASS' : 'REJECT';

    if (!allPassed) {
      this.logger.warn(`Triple Verification REJECTED: ${failedChecks.join(', ')}`);
    }

    return { pixelDiff, structuralSimilarity: structuralSim, spatialFidelity, verdict, failedChecks, confidenceScore };
  }

  /**
   * Batch verification for multiple elements
   */
  verifyBatch(elements: Array<{ id: string; pixelDiff: number; structural: number; spatial: number }>): {
    overallVerdict: 'PASS' | 'REJECT';
    results: Array<VerificationResult & { elementId: string }>;
    passRate: number;
  } {
    const results = elements.map(el => ({
      elementId: el.id,
      ...this.verify(el.pixelDiff, el.structural, el.spatial),
    }));

    const passRate = results.reduce((c, r) => c + (r.verdict === 'PASS' ? 1 : 0), 0) / Math.max(results.length, 1);
    const overallVerdict = passRate === 1.0 ? 'PASS' : 'REJECT';

    return { overallVerdict, results, passRate };
  }
}
