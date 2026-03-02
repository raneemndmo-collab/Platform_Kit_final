// Rasid v6.4 — Design Stability Scoring — Part XIII

export interface DesignElement { id: string; x: number; y: number; width: number; height: number; fontSize?: number; fontWeight?: string; contrast?: number; type?: string; }
export interface DesignScore { alignmentVariance: number; gridCoherence: number; typographyHarmony: number; whitespaceRhythm: number; contrastStability: number; visualEntropy: number; overall: number; }

export class DesignStabilityScoringEngine {
  private readonly PROFESSIONAL_THRESHOLD = 0.92;

  compute(elements: DesignElement[], canvasWidth: number, canvasHeight: number): DesignScore {
    const alignVar = this.computeAlignmentVariance(elements);
    const gridCoh = this.computeGridCoherence(elements, canvasWidth);
    const typoHarm = this.computeTypographyHarmony(elements);
    const wsRhythm = this.computeWhitespaceRhythm(elements, canvasWidth, canvasHeight);
    const contrastStab = this.computeContrastStability(elements);
    const visEntropy = this.computeVisualEntropy(elements, canvasWidth, canvasHeight);
    const overall = alignVar * 0.2 + gridCoh * 0.15 + typoHarm * 0.15 + wsRhythm * 0.2 + contrastStab * 0.15 + visEntropy * 0.15;
    return { alignmentVariance: alignVar, gridCoherence: gridCoh, typographyHarmony: typoHarm, whitespaceRhythm: wsRhythm, contrastStability: contrastStab, visualEntropy: visEntropy, overall };
  }

  meetsThreshold(score: DesignScore, mode: 'STRICT' | 'PROFESSIONAL'): boolean {
    return mode === 'STRICT' ? true : score.overall >= this.PROFESSIONAL_THRESHOLD;
  }

  // GAP-21: Real alignment variance — measure how well elements snap to common axes
  private computeAlignmentVariance(elements: DesignElement[]): number {
    if (elements.length < 2) return 1;
    const leftEdges = elements.map(e => e.x);
    const topEdges = elements.map(e => e.y);
    const rightEdges = elements.map(e => e.x + e.width);
    // Count how many unique alignment axes exist (fewer = better aligned)
    const snapTolerance = 4;
    const uniqueLefts = this.countUniqueClusters(leftEdges, snapTolerance);
    const uniqueTops = this.countUniqueClusters(topEdges, snapTolerance);
    const uniqueRights = this.countUniqueClusters(rightEdges, snapTolerance);
    const idealAxes = Math.ceil(Math.sqrt(elements.length));
    const score = 1 - Math.min(1, ((uniqueLefts + uniqueTops + uniqueRights) / 3 - idealAxes) / (elements.length));
    return Math.max(0, Math.min(1, score));
  }

  // GAP-21: Real grid coherence — do elements fit a regular grid?
  private computeGridCoherence(elements: DesignElement[], canvasWidth: number): number {
    if (elements.length < 2) return 1;
    const xs = elements.map(e => e.x).sort((a, b) => a - b);
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    if (gaps.length === 0) return 1;
    const meanGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const gapVariance = gaps.reduce((s, g) => s + (g - meanGap) ** 2, 0) / gaps.length;
    const normalizedVar = Math.sqrt(gapVariance) / (meanGap || 1);
    return Math.max(0, 1 - normalizedVar);
  }

  // GAP-21: Typography harmony — are font sizes in harmonic ratios?
  private computeTypographyHarmony(elements: DesignElement[]): number {
    const fontSizes = elements.filter(e => e.fontSize).map(e => e.fontSize!);
    if (fontSizes.length < 2) return 1;
    const unique = [...new Set(fontSizes)].sort((a, b) => b - a);
    if (unique.length < 2) return 1;
    const harmonicRatios = [1, 1.125, 1.2, 1.25, 1.333, 1.5, 1.618, 2, 2.5, 3];
    const ratios = unique.slice(1).map((s, i) => unique[i] / s);
    const harmonicScore = ratios.map(r => Math.min(...harmonicRatios.map(hr => Math.abs(r - hr)))).reduce((s, d) => s + Math.max(0, 1 - d), 0);
    return harmonicScore / ratios.length;
  }

  // GAP-21: Whitespace rhythm — consistent spacing patterns
  private computeWhitespaceRhythm(elements: DesignElement[], w: number, h: number): number {
    if (elements.length < 2) return 1;
    // Measure vertical gaps between consecutive elements
    const sorted = [...elements].sort((a, b) => a.y - b.y);
    const vGaps = sorted.slice(1).map((el, i) => el.y - (sorted[i].y + sorted[i].height));
    if (vGaps.length === 0) return 1;
    const meanGap = vGaps.reduce((s, g) => s + g, 0) / vGaps.length;
    const gapDeviation = vGaps.reduce((s, g) => s + Math.abs(g - meanGap), 0) / vGaps.length;
    return Math.max(0, 1 - gapDeviation / (meanGap || w * 0.1));
  }

  // Contrast stability — are contrast levels consistent within groups?
  private computeContrastStability(elements: DesignElement[]): number {
    const contrasts = elements.map(e => e.contrast || 0.5);
    if (contrasts.length < 2) return 1;
    const mean = contrasts.reduce((s, c) => s + c, 0) / contrasts.length;
    const variance = contrasts.reduce((s, c) => s + (c - mean) ** 2, 0) / contrasts.length;
    return Math.max(0, 1 - Math.sqrt(variance) * 2);
  }

  // Visual entropy — information distribution across canvas
  private computeVisualEntropy(elements: DesignElement[], w: number, h: number): number {
    const gridSize = 4;
    const cells = Array(gridSize * gridSize).fill(0);
    for (const el of elements) {
      const cx = Math.min(gridSize - 1, Math.floor((el.x + el.width / 2) / (w / gridSize)));
      const cy = Math.min(gridSize - 1, Math.floor((el.y + el.height / 2) / (h / gridSize)));
      cells[cy * gridSize + cx] += el.width * el.height;
    }
    const total = cells.reduce((s, c) => s + c, 0) || 1;
    const probs = cells.map(c => c / total).filter(p => p > 0);
    const entropy = -probs.reduce((s, p) => s + p * Math.log2(p), 0);
    const maxEntropy = Math.log2(gridSize * gridSize);
    return entropy / maxEntropy; // 1.0 = perfectly distributed
  }

  private countUniqueClusters(values: number[], tolerance: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    let clusters = sorted.length > 0 ? 1 : 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > tolerance) clusters++;
    }
    return clusters;
  }

// GAP-30 FIX: Stability measurement over multiple data refreshes
  measureStabilityOverTime(snapshots: Array<Array<{ id: string; x: number; y: number; width: number; height: number }>>): {
    avgShift: number;
    maxShift: number;
    stableElements: string[];
    unstableElements: string[];
    stabilityTrend: 'improving' | 'degrading' | 'stable';
  } {
    if (snapshots.length < 2) return { avgShift: 0, maxShift: 0, stableElements: [], unstableElements: [], stabilityTrend: 'stable' };
    
    const elementShifts = new Map<string, number[]>();
    for (let i = 1; i < snapshots.length; i++) {
      const prev = new Map(snapshots[i - 1].map(e => [e.id, e]));
      for (const el of snapshots[i]) {
        const p = prev.get(el.id);
        if (p) {
          const shift = Math.sqrt((el.x - p.x) ** 2 + (el.y - p.y) ** 2);
          if (!elementShifts.has(el.id)) elementShifts.set(el.id, []);
          elementShifts.get(el.id)!.push(shift);
        }
      }
    }
    
    const stableElements: string[] = [];
    const unstableElements: string[] = [];
    let totalShift = 0, maxShift = 0, count = 0;
    
    for (const [id, shifts] of elementShifts) {
      const avg = shifts.reduce((s, v) => s + v, 0) / shifts.length;
      if (avg < 2) stableElements.push(id);
      else unstableElements.push(id);
      totalShift += avg;
      maxShift = Math.max(maxShift, Math.max(...shifts));
      count++;
    }
    
    // Trend: compare first half shifts to second half
    const midpoint = Math.floor(snapshots.length / 2);
    const earlyShifts: number[] = [], lateShifts: number[] = [];
    for (const [, shifts] of elementShifts) {
      earlyShifts.push(...shifts.slice(0, midpoint));
      lateShifts.push(...shifts.slice(midpoint));
    }
    const earlyAvg = earlyShifts.length > 0 ? earlyShifts.reduce((s, v) => s + v, 0) / earlyShifts.length : 0;
    const lateAvg = lateShifts.length > 0 ? lateShifts.reduce((s, v) => s + v, 0) / lateShifts.length : 0;
    const trend = lateAvg < earlyAvg * 0.8 ? 'improving' : lateAvg > earlyAvg * 1.2 ? 'degrading' : 'stable';
    
    return { avgShift: count > 0 ? totalShift / count : 0, maxShift, stableElements, unstableElements, stabilityTrend: trend };
  }
}
