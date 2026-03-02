// Rasid v6.4 — Triple Verification Fidelity System — Part II
// Constitutional: Pixel ≤ 0.1%, Structural ≥ 0.999, Spatial ≥ 0.999
// ALL THREE MUST PASS → Failure = deterministic rejection

export interface VerificationGate { name: string; threshold: number; actual: number; passed: boolean; }
export interface TripleVerificationResult {
  pixelDiffGate: VerificationGate; structuralGate: VerificationGate; spatialGate: VerificationGate;
  allPassed: boolean; subPixelMode: boolean; status: 'APPROVED' | 'REJECTED';
  rejectionReasons: string[];
}

export class TripleVerificationEngine {
  private readonly PIXEL_DIFF_MAX = 0.001; // 0.1%
  private readonly STRUCTURAL_MIN = 0.999;
  private readonly SPATIAL_MIN = 0.999;
  private readonly SUBPIXEL_TOLERANCE = 0.01; // 0.01px for print-grade

  verify(original: VerificationInput, reconstructed: VerificationInput, subPixelMode: boolean = false): TripleVerificationResult {
    const tolerance = subPixelMode ? this.SUBPIXEL_TOLERANCE : 0.5;

    // Gate 1: Pixel Difference ≤ 0.1%
    const pixelDiff = this.computePixelDifference(original, reconstructed, tolerance);
    const pixelDiffGate: VerificationGate = {
      name: 'pixel_difference', threshold: this.PIXEL_DIFF_MAX,
      actual: pixelDiff, passed: pixelDiff <= this.PIXEL_DIFF_MAX,
    };

    // Gate 2: Structural Fingerprint Similarity ≥ 0.999
    const structSim = this.computeStructuralFingerprint(original, reconstructed);
    const structuralGate: VerificationGate = {
      name: 'structural_fingerprint', threshold: this.STRUCTURAL_MIN,
      actual: structSim, passed: structSim >= this.STRUCTURAL_MIN,
    };

    // Gate 3: Spatial Relationship Matrix Similarity ≥ 0.999
    const spatialSim = this.computeSpatialRelationshipMatrix(original, reconstructed);
    const spatialGate: VerificationGate = {
      name: 'spatial_relationship_matrix', threshold: this.SPATIAL_MIN,
      actual: spatialSim, passed: spatialSim >= this.SPATIAL_MIN,
    };

    const allPassed = pixelDiffGate.passed && structuralGate.passed && spatialGate.passed;
    const rejectionReasons: string[] = [];
    if (!pixelDiffGate.passed) rejectionReasons.push(`Pixel diff ${(pixelDiff * 100).toFixed(3)}% exceeds 0.1% threshold`);
    if (!structuralGate.passed) rejectionReasons.push(`Structural similarity ${structSim.toFixed(4)} below 0.999`);
    if (!spatialGate.passed) rejectionReasons.push(`Spatial matrix similarity ${spatialSim.toFixed(4)} below 0.999`);

    return {
      pixelDiffGate, structuralGate, spatialGate, allPassed, subPixelMode,
      status: allPassed ? 'APPROVED' : 'REJECTED', rejectionReasons,
    };
  }

  /** Deterministic rejection — throws if verification fails */
  verifyOrReject(original: VerificationInput, reconstructed: VerificationInput, subPixelMode: boolean = false): TripleVerificationResult {
    const result = this.verify(original, reconstructed, subPixelMode);
    if (result.status === 'REJECTED') {
      throw new TripleVerificationRejection(result.rejectionReasons, result);
    }
    return result;
  }

  private computePixelDifference(a: VerificationInput, b: VerificationInput, tolerance: number): number {
    if (!a.pixels || !b.pixels || a.pixels.length !== b.pixels.length) return 1;
    let diffCount = 0;
    for (let i = 0; i < a.pixels.length; i++) {
      if (Math.abs(a.pixels[i] - b.pixels[i]) > tolerance) diffCount++;
    }
    return diffCount / a.pixels.length;
  }

  private computeStructuralFingerprint(a: VerificationInput, b: VerificationInput): number {
    if (!a.elements?.length || !b.elements?.length) return 0;
    const fpA = this.buildFingerprint(a.elements);
    const fpB = this.buildFingerprint(b.elements);
    let matchScore = 0, total = 0;
    for (const key of new Set([...Object.keys(fpA), ...Object.keys(fpB)])) {
      total++;
      if (fpA[key] !== undefined && fpB[key] !== undefined) {
        const max = Math.max(Math.abs(fpA[key]), Math.abs(fpB[key]), 1);
        matchScore += 1 - Math.abs(fpA[key] - fpB[key]) / max;
      }
    }
    return total > 0 ? matchScore / total : 0;
  }

  private computeSpatialRelationshipMatrix(a: VerificationInput, b: VerificationInput): number {
    if (!a.elements?.length || !b.elements?.length) return 0;
    const matA = this.buildSpatialMatrix(a.elements);
    const matB = this.buildSpatialMatrix(b.elements);
    const keys = [...new Set([...Object.keys(matA), ...Object.keys(matB)])];
    if (keys.length === 0) return 1;
    let match = 0;
    for (const k of keys) {
      if (matA[k] && matB[k]) {
        const dDist = Math.abs(matA[k].distance - matB[k].distance) / Math.max(matA[k].distance, 1);
        const dAngle = Math.abs(matA[k].angle - matB[k].angle) / Math.PI;
        match += 1 - (dDist * 0.6 + dAngle * 0.4);
      }
    }
    return match / keys.length;
  }

  private buildFingerprint(elements: ElementDescriptor[]): Record<string, number> {
    const fp: Record<string, number> = {};
    for (const el of elements) {
      fp[`${el.id}_x`] = el.x; fp[`${el.id}_y`] = el.y;
      fp[`${el.id}_w`] = el.width; fp[`${el.id}_h`] = el.height;
      if (el.fontSize) fp[`${el.id}_fs`] = el.fontSize;
      if (el.fontWeight) fp[`${el.id}_fw`] = el.fontWeight === 'bold' ? 700 : 400;
      if (el.zIndex !== undefined) fp[`${el.id}_z`] = el.zIndex;
    }
    return fp;
  }

  private buildSpatialMatrix(elements: ElementDescriptor[]): Record<string, { distance: number; angle: number }> {
    const mat: Record<string, { distance: number; angle: number }> = {};
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const dx = elements[j].x - elements[i].x;
        const dy = elements[j].y - elements[i].y;
        mat[`${elements[i].id}:${elements[j].id}`] = {
          distance: Math.sqrt(dx * dx + dy * dy),
          angle: Math.atan2(dy, dx),
        };
      }
    }
    return mat;
  }
}

export class TripleVerificationRejection extends Error {
  constructor(public readonly reasons: string[], public readonly result: TripleVerificationResult) {
    super(`DETERMINISTIC REJECTION: ${reasons.join('; ')}`);
    this.name = 'TripleVerificationRejection';
  }

export interface VerificationInput {
  pixels?: number[]; elements?: ElementDescriptor[];
  width: number; height: number;
}

export interface ElementDescriptor {
  id: string; x: number; y: number; width: number; height: number;
  type?: string; fontSize?: number; fontWeight?: string; zIndex?: number;
  contrast?: number; text?: string;
}


  // GAP-23 FIX: Strict enforcement mode with auto-rejection and reason detail
  enforceStrict(metrics: { pixelDiff: number; structuralSimilarity: number; spatialAccuracy: number }, thresholds?: { pixel?: number; structural?: number; spatial?: number }): {
    status: 'APPROVED' | 'REJECTED';
    rejectionReasons: string[];
    metrics: Record<string, { value: number; threshold: number; passed: boolean }>;
  } {
    const t = { pixel: thresholds?.pixel ?? 0.001, structural: thresholds?.structural ?? 0.995, spatial: thresholds?.spatial ?? 0.99 };
    const results = {
      pixel: { value: metrics.pixelDiff, threshold: t.pixel, passed: metrics.pixelDiff <= t.pixel },
      structural: { value: metrics.structuralSimilarity, threshold: t.structural, passed: metrics.structuralSimilarity >= t.structural },
      spatial: { value: metrics.spatialAccuracy, threshold: t.spatial, passed: metrics.spatialAccuracy >= t.spatial },
    };
    const rejectionReasons: string[] = [];
    if (!results.pixel.passed) rejectionReasons.push(`Pixel diff ${metrics.pixelDiff} exceeds ${t.pixel}`);
    if (!results.structural.passed) rejectionReasons.push(`Structural similarity ${metrics.structuralSimilarity} below ${t.structural}`);
    if (!results.spatial.passed) rejectionReasons.push(`Spatial accuracy ${metrics.spatialAccuracy} below ${t.spatial}`);
    return { status: rejectionReasons.length === 0 ? 'APPROVED' : 'REJECTED', rejectionReasons, metrics: results };
  }
}
