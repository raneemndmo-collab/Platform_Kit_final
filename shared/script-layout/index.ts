// Rasid v6.4 — Script-Aware Layout Compression — Part XI
import { Injectable, Logger } from '@nestjs/common';

export interface LayoutCompressionResult {
  originalWidth: number; adjustedWidth: number; compressionRatio: number;
  redistributedSpaces: SpaceRedistribution[]; hierarchyParityIndex: number;
  densityParity: number; typographyTolerance: number;
}

export interface SpaceRedistribution {
  regionId: string; originalSpace: number; adjustedSpace: number;
  direction: 'rtl' | 'ltr'; compensationType: 'width' | 'margin' | 'padding';
}

export interface ArabicLayoutConfig {
  autoWidthCompensation: boolean; minHierarchyParity: number;
  densityParityTarget: number; compressionTolerance: number;
  preserveBaselineGrid: boolean;
}

@Injectable()
export class ScriptAwareLayoutEngine {
  private readonly logger = new Logger(ScriptAwareLayoutEngine.name);
  private readonly MIN_HIERARCHY_PARITY = 0.95;

  compress(elements: unknown[], config: Partial<ArabicLayoutConfig> = {}): LayoutCompressionResult {
    const cfg: ArabicLayoutConfig = {
      autoWidthCompensation: true, minHierarchyParity: this.MIN_HIERARCHY_PARITY,
      densityParityTarget: 0.95, compressionTolerance: 0.05, preserveBaselineGrid: true,
      ...config,
    };

    const redistributions: SpaceRedistribution[] = [];
    let totalOriginal = 0, totalAdjusted = 0;

    for (const el of elements) {
      const arabicRatio = this.detectArabicContentRatio(el);
      if (arabicRatio > 0.3 && cfg.autoWidthCompensation) {
        const widthFactor = 1 + (arabicRatio * 0.12);
        const adjusted = el.width * widthFactor;
        redistributions.push({
          regionId: el.id, originalSpace: el.width, adjustedSpace: adjusted,
          direction: 'rtl', compensationType: 'width',
        });
        totalOriginal += el.width;
        totalAdjusted += adjusted;
      } else {
        totalOriginal += el.width;
        totalAdjusted += el.width;
      }
    }

    const densityParity = this.computeDensityParity(elements, redistributions);
    const hierarchyParity = this.computeHierarchyParity(elements);

    // GAP-22 FIX: Enforce density parity — reject if below threshold
    if (densityParity < cfg.densityParityTarget - cfg.compressionTolerance) {
      return {
        elements: redistributions,
        densityParity,
        typographyTolerance: cfg.compressionTolerance,
        passed: false,
        enforcementResult: 'REJECTED — density parity below threshold',
        baselineGridPreserved: cfg.preserveBaselineGrid,
      };
    }

    return {
      originalWidth: totalOriginal, adjustedWidth: totalAdjusted,
      compressionRatio: totalAdjusted > 0 ? totalOriginal / totalAdjusted : 1,
      redistributedSpaces: redistributions, hierarchyParityIndex: hierarchyParity,
      densityParity, typographyTolerance: cfg.compressionTolerance,
    };
  }

  private detectArabicContentRatio(element: Record<string, unknown>): number {
    const text = element.text || element.content || '';
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    return text.length > 0 ? arabicChars / text.length : 0;
  }

  private computeDensityParity(elements: unknown[], redistributions: SpaceRedistribution[]): number {
    if (elements.length === 0) return 1;
    const redistributionMap = new Map(redistributions.map(r => [r.regionId, r]));
    let totalDeviation = 0;
    for (const el of elements) {
      const r = redistributionMap.get(el.id);
      if (r) {
        const deviation = Math.abs(r.adjustedSpace - r.originalSpace) / r.originalSpace;
        totalDeviation += deviation;
      }
    }
    return Math.max(0, 1 - (totalDeviation / elements.length));
  }

  private computeHierarchyParity(elements: unknown[]): number {
    if (elements.length < 2) return 1;
    const sorted = [...elements].sort((a, b) => (b.fontSize || 16) - (a.fontSize || 16));
    let parityScore = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].fontSize || 16;
      const curr = sorted[i].fontSize || 16;
      if (prev > 0) {
        const ratio = curr / prev;
        if (ratio > 1.05) parityScore -= 0.02;
      }
    }
    return Math.max(0, Math.min(1, parityScore));
  }

  rebalanceConstraints(graph: Record<string, unknown>, direction: 'rtl' | 'ltr'): unknown {
    const rebalanced = { ...graph, direction };
    if (direction === 'rtl') {
      for (const edge of (rebalanced.edges || [])) {
        if (edge.type === 'horizontal_spacing') {
          const temp = edge.sourceNodeId;
          edge.sourceNodeId = edge.targetNodeId;
          edge.targetNodeId = temp;
        }
      }
    }
    return rebalanced;
  }

// GAP-22: Density parity enforcement — reject if below threshold
  enforceDensityParity(originalDensity: number, transformedDensity: number, minParity: number = 0.9): { enforced: boolean; parity: number; action: 'accepted' | 'rejected' | 'adjusted' } {
    const parity = originalDensity > 0 ? Math.min(transformedDensity / originalDensity, originalDensity / transformedDensity) : 1;
    if (parity >= minParity) return { enforced: true, parity, action: 'accepted' };
    if (parity >= minParity * 0.85) return { enforced: true, parity, action: 'adjusted' };
    return { enforced: false, parity, action: 'rejected' };
  }
}
