// Rasid v6.4 — Confidence-Weighted Reconstruction — Part IV

export interface ConfidenceFactors {
  ocrConfidence: number;       // OCR quality 0-1
  layoutDetectionStability: number; // Layout detection consistency 0-1 (GAP-09)
  constraintCoherence: number; // MCGE constraint satisfaction 0-1
  dataInferenceConfidence: number;  // Data binding accuracy 0-1
}

export interface ConfidenceResult {
  score: number;
  status: 'AUTO_LOCK' | 'REVIEW' | 'FLAGGED';
  factors: ConfidenceFactors;
  elementScores: Array<{ elementId: string; score: number; status: string; weakestFactor: string }>;
}

export class ConfidenceWeightedEngine {
  private readonly AUTO_LOCK_THRESHOLD = 0.98;
  private readonly REVIEW_THRESHOLD = 0.90;

  private readonly WEIGHTS = {
    ocrConfidence: 0.3,
    layoutDetectionStability: 0.25,  // GAP-09: Added layout detection
    constraintCoherence: 0.25,
    dataInferenceConfidence: 0.2,
  };

  computeConfidence(elements: Array<{ id: string; factors: Partial<ConfidenceFactors> }>): ConfidenceResult {
    const elementScores: ConfidenceResult['elementScores'] = [];
    let totalScore = 0;

    for (const el of elements) {
      const factors: ConfidenceFactors = {
        ocrConfidence: el.factors.ocrConfidence ?? 0.95,
        layoutDetectionStability: el.factors.layoutDetectionStability ?? 0.9,
        constraintCoherence: el.factors.constraintCoherence ?? 0.95,
        dataInferenceConfidence: el.factors.dataInferenceConfidence ?? 0.9,
      };

      const score =
        factors.ocrConfidence * this.WEIGHTS.ocrConfidence +
        factors.layoutDetectionStability * this.WEIGHTS.layoutDetectionStability +
        factors.constraintCoherence * this.WEIGHTS.constraintCoherence +
        factors.dataInferenceConfidence * this.WEIGHTS.dataInferenceConfidence;

      // Find weakest factor
      const entries = Object.entries(factors) as [string, number][];
      const weakest = entries.reduce((w, [k, v]) => v < w[1] ? [k, v] : w, ['none', 1]);

      const status = score >= this.AUTO_LOCK_THRESHOLD ? 'AUTO_LOCK' : score >= this.REVIEW_THRESHOLD ? 'REVIEW' : 'FLAGGED';
      elementScores.push({ elementId: el.id, score, status, weakestFactor: weakest[0] });
      totalScore += score;
    }

    const avgScore = elements.length > 0 ? totalScore / elements.length : 0;
    const overallStatus = avgScore >= this.AUTO_LOCK_THRESHOLD ? 'AUTO_LOCK' : avgScore >= this.REVIEW_THRESHOLD ? 'REVIEW' : 'FLAGGED';

    return {
      score: avgScore, status: overallStatus,
      factors: {
        ocrConfidence: elements.reduce((s, e) => s + (e.factors.ocrConfidence ?? 0.95), 0) / (elements.length || 1),
        layoutDetectionStability: elements.reduce((s, e) => s + (e.factors.layoutDetectionStability ?? 0.9), 0) / (elements.length || 1),
        constraintCoherence: elements.reduce((s, e) => s + (e.factors.constraintCoherence ?? 0.95), 0) / (elements.length || 1),
        dataInferenceConfidence: elements.reduce((s, e) => s + (e.factors.dataInferenceConfidence ?? 0.9), 0) / (elements.length || 1),
      },
      elementScores,
    };
  }

  isAutoLocked(score: number): boolean { return score >= this.AUTO_LOCK_THRESHOLD; }
  needsReview(score: number): boolean { return score >= this.REVIEW_THRESHOLD && score < this.AUTO_LOCK_THRESHOLD; }
  isFlagged(score: number): boolean { return score < this.REVIEW_THRESHOLD; }

// GAP-21 FIX: Detailed confidence breakdown with granular metrics
  detailedBreakdown(elementFactors: Array<{ elementId: string; factors: Record<string, number> }>): {
    overall: number;
    perElement: Array<{ elementId: string; score: number; weakest: string; strongest: string }>;
    recommendations: string[];
  } {
    const perElement = elementFactors.map(ef => {
      const entries = Object.entries(ef.factors);
      const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
      const sorted = entries.sort((a, b) => a[1] - b[1]);
      return { elementId: ef.elementId, score: avg, weakest: sorted[0]?.[0] || 'none', strongest: sorted[sorted.length - 1]?.[0] || 'none' };
    });
    const overall = perElement.reduce((s, e) => s + e.score, 0) / (perElement.length || 1);
    const recommendations: string[] = [];
    const weakAreas = new Map<string, number>();
    for (const el of perElement) {
      weakAreas.set(el.weakest, (weakAreas.get(el.weakest) || 0) + 1);
    }
    for (const [area, count] of weakAreas) {
      if (count > perElement.length * 0.3) recommendations.push(`Improve ${area} — weak in ${count}/${perElement.length} elements`);
    }
    return { overall, perElement, recommendations };
  }
}
