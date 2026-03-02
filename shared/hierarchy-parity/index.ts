// Rasid v6.4 — Hierarchy Parity Index — Part XII
import { Injectable } from '@nestjs/common';

export interface HierarchyMetrics { prominenceShifts: number; emphasisRetention: number; fontWeightParity: number; contrastParity: number; sectionDominance: number; overallParity: number; }

@Injectable()
export class HierarchyParityEngine {
  private readonly THRESHOLD = 0.95;

  compute(original: HierarchyElement[], transformed: HierarchyElement[]): HierarchyMetrics {
    const prominenceShifts = this.measureProminence(original, transformed);
    const emphasisRetention = this.measureEmphasis(original, transformed);
    const fontWeightParity = this.measureFontWeight(original, transformed);
    const contrastParity = this.measureContrast(original, transformed);
    const sectionDominance = this.measureDominance(original, transformed);
    const overallParity = (prominenceShifts + emphasisRetention + fontWeightParity + contrastParity + sectionDominance) / 5;
    return { prominenceShifts, emphasisRetention, fontWeightParity, contrastParity, sectionDominance, overallParity };
  }

  passes(metrics: HierarchyMetrics): boolean { return metrics.overallParity >= this.THRESHOLD; }

  private measureProminence(a: HierarchyElement[], b: HierarchyElement[]): number {
    const aRanks = this.rankBySize(a), bRanks = this.rankBySize(b);
    let match = 0;
    for (let i = 0; i < Math.min(aRanks.length, bRanks.length); i++) { if (aRanks[i] === bRanks[i]) match++; }
    return Math.min(aRanks.length, bRanks.length) > 0 ? match / Math.min(aRanks.length, bRanks.length) : 1;
  }

  private measureEmphasis(a: HierarchyElement[], b: HierarchyElement[]): number {
    let score = 0, count = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i].emphasis === b[i].emphasis) score++;
      count++;
    }
    return count > 0 ? score / count : 1;
  }

  private measureFontWeight(a: HierarchyElement[], b: HierarchyElement[]): number {
    let score = 0, count = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      score += 1 - Math.abs((a[i].fontWeight || 400) - (b[i].fontWeight || 400)) / 900;
      count++;
    }
    return count > 0 ? score / count : 1;
  }

  private measureContrast(a: HierarchyElement[], b: HierarchyElement[]): number {
    let score = 0, count = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      score += 1 - Math.abs((a[i].contrast || 0.5) - (b[i].contrast || 0.5));
      count++;
    }
    return count > 0 ? score / count : 1;
  }

  private measureDominance(a: HierarchyElement[], b: HierarchyElement[]): number {
    const aDom = a.reduce((max, e) => e.area > (max?.area || 0) ? e : max, a[0]);
    const bDom = b.reduce((max, e) => e.area > (max?.area || 0) ? e : max, b[0]);
    if (!aDom || !bDom) return 1;
    return aDom.id === bDom.id ? 1 : 0.8;
  }

  private rankBySize(elements: HierarchyElement[]): string[] {
    return [...elements].sort((a, b) => b.area - a.area).map(e => e.id);
  }
}

export interface HierarchyElement { id: string; area: number; fontSize?: number; fontWeight?: number; contrast?: number; emphasis?: string; }
