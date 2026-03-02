// Rasid v6.4 — Visual Cognitive Load Estimator — Part XV
import { Injectable } from '@nestjs/common';

export interface CognitiveLoadResult {
  score: number; focalPointCount: number; quadrantDensity: QuadrantDensity;
  contrastHotspots: number; cognitiveClusterCount: number;
  overloaded: boolean; suggestions: string[];
}

export interface QuadrantDensity { TL: number; TR: number; BL: number; BR: number; imbalance: number; }

@Injectable()
export class CognitiveLoadEstimator {
  private readonly MAX_FOCAL_POINTS = 7;
  private readonly IMBALANCE_THRESHOLD = 0.35;

  estimate(elements: Array<{ x: number; y: number; width: number; height: number; weight?: number; contrast?: number }>, canvasWidth: number, canvasHeight: number): CognitiveLoadResult {
    const midX = canvasWidth / 2, midY = canvasHeight / 2;
    const quadrants = { TL: 0, TR: 0, BL: 0, BR: 0 };
    let contrastHotspots = 0;

    for (const el of elements) {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      const area = el.width * el.height * (el.weight || 1);
      if (cx <= midX && cy <= midY) quadrants.TL += area;
      else if (cx > midX && cy <= midY) quadrants.TR += area;
      else if (cx <= midX && cy > midY) quadrants.BL += area;
      else quadrants.BR += area;
      if ((el.contrast || 0) > 0.8) contrastHotspots++;
    }

    const totalArea = Object.values(quadrants).reduce((s, v) => s + v, 0) || 1;
    const normalized = { TL: quadrants.TL / totalArea, TR: quadrants.TR / totalArea, BL: quadrants.BL / totalArea, BR: quadrants.BR / totalArea };
    const ideal = 0.25;
    const imbalance = Math.max(...Object.values(normalized).map(v => Math.abs(v - ideal)));

    const focalPoints = this.detectFocalPoints(elements);
    const clusters = this.detectClusters(elements, canvasWidth * 0.15);

    const score = Math.min(1, (focalPoints / this.MAX_FOCAL_POINTS) * 0.3 + imbalance * 0.3 + (contrastHotspots / Math.max(elements.length, 1)) * 0.2 + (clusters / Math.max(elements.length, 1)) * 0.2);
    const overloaded = score > 0.7;

    const suggestions: string[] = [];
    if (focalPoints > this.MAX_FOCAL_POINTS) suggestions.push(`Too many focal points (${focalPoints}). Consider reducing to ${this.MAX_FOCAL_POINTS} or fewer.`);
    if (imbalance > this.IMBALANCE_THRESHOLD) suggestions.push('Significant quadrant density imbalance detected. Redistribute visual weight.');
    if (contrastHotspots > 3) suggestions.push('Multiple contrast hotspots detected. Reduce competing high-contrast elements.');

    return { score, focalPointCount: focalPoints, quadrantDensity: { ...normalized, imbalance }, contrastHotspots, cognitiveClusterCount: clusters, overloaded, suggestions };
  }

  private detectFocalPoints(elements: Array<{ weight?: number; contrast?: number }>): number {
    return elements.reduce((c, e) => c + ((e.weight || 0) > 0.7 || (e.contrast || 0) > 0.8 ? 1 : 0), 0);
  }

  private detectClusters(elements: Array<{ x: number; y: number }>, radius: number): number {
    const visited = new Set<number>();
    let clusters = 0;
    for (let i = 0; i < elements.length; i++) {
      if (visited.has(i)) continue;
      let clusterSize = 0;
      const queue = [i];
      while (queue.length > 0) {
        const idx = queue.pop()!;
        if (visited.has(idx)) continue;
        visited.add(idx);
        clusterSize++;
        for (let j = 0; j < elements.length; j++) {
          if (!visited.has(j)) {
            const dx = elements[idx].x - elements[j].x, dy = elements[idx].y - elements[j].y;
            if (Math.sqrt(dx * dx + dy * dy) < radius) queue.push(j);
          }
        }
      }
      if (clusterSize >= 2) clusters++;
    }
    return clusters;
  }

// GAP-17: Mode-aware estimation with STRICT protection
  estimateWithMode(elements: Array<{ x: number; y: number; width: number; height: number; contrast?: number }>, canvasWidth: number, canvasHeight: number, mode: 'STRICT' | 'PROFESSIONAL'): { score: number; overloaded: boolean; suggestions: string[]; modeApplied: string } {
    const result = this.estimate(elements, canvasWidth, canvasHeight);
    if (mode === 'STRICT') {
      // STRICT mode SHALL NOT modify layout — return result without suggestions
      return { ...result, suggestions: [], modeApplied: 'STRICT — no modifications allowed' };
    }
    // PROFESSIONAL mode MAY suggest decluttering
    const suggestions: string[] = [];
    if (result.overloaded) suggestions.push('Consider reducing the number of visual elements');
    if (result.score > 0.8) suggestions.push('High cognitive load — group related elements');
    return { ...result, suggestions, modeApplied: 'PROFESSIONAL — suggestions generated' };
  }
}
