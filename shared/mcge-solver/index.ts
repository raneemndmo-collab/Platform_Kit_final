// Rasid v6.4 — MCGE Constraint Solver — GAP-15 Fix
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger } from '@nestjs/common';

export interface MCGEConstraint {
  id: string;
  type: 'alignment' | 'spacing' | 'proportion' | 'symmetry' | 'containment';
  elements: string[];
  params: Record<string, number>;
  priority: number;        // 0-1, higher = more important
  satisfied?: boolean;
}

export interface MCGEResult {
  satisfied: boolean;
  satisfactionRate: number;
  violations: Array<{ constraintId: string; severity: number; suggestion: string }>;
  adjustments: Array<{ elementId: string; dx: number; dy: number; dw: number; dh: number }>;
}

@Injectable()
export class MCGEConstraintSolver {
  private readonly logger = new Logger(MCGEConstraintSolver.name);
  private readonly MAX_ITERATIONS = 50;
  private readonly CONVERGENCE_THRESHOLD = 0.001;

  solve(
    elements: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    constraints: MCGEConstraint[],
  ): MCGEResult {
    const sorted = [...constraints].sort((a, b) => b.priority - a.priority);
    const adjustments = new BoundedMap<string, { dx: number; dy: number; dw: number; dh: number }>(10_000);
    let prevEnergy = Infinity;

    for (let iter = 0; iter < this.MAX_ITERATIONS; iter++) {
      let totalEnergy = 0;

      for (const constraint of sorted) {
        const energy = this.evaluateConstraint(constraint, elements, adjustments);
        totalEnergy += energy * constraint.priority;
      }

      if (Math.abs(prevEnergy - totalEnergy) < this.CONVERGENCE_THRESHOLD) break;
      prevEnergy = totalEnergy;
    }

    const violations: MCGEResult['violations'] = [];
    let satisfiedCount = 0;

    for (const c of sorted) {
      const energy = this.evaluateConstraint(c, elements, adjustments);
      if (energy < 0.05) {
        satisfiedCount++;
      } else {
        violations.push({
          constraintId: c.id,
          severity: energy,
          suggestion: this.suggestFix(c, energy),
        });
      }
    }

    return {
      satisfied: violations.length === 0,
      satisfactionRate: sorted.length > 0 ? satisfiedCount / sorted.length : 1,
      violations,
      adjustments: Array.from(adjustments.entries()).map(([id, adj]) => ({ elementId: id, ...adj })),
    };
  }

  private evaluateConstraint(
    constraint: MCGEConstraint,
    elements: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    adjustments: Map<string, { dx: number; dy: number; dw: number; dh: number }>,
  ): number {
    const elMap = new Map(elements.map(e => [e.id, e]));

    switch (constraint.type) {
      case 'alignment': {
        const axis = constraint.params['axis'] || 0; // 0=horizontal, 1=vertical
        const targets = constraint.elements.map(id => elMap.get(id)).filter(Boolean);
        if (targets.length < 2) return 0;
        const positions = targets.map(t => axis === 0 ? t!.y : t!.x);
        const avg = positions.reduce((s, v) => s + v, 0) / positions.length;
        const maxDev = Math.max(...positions.map(p => Math.abs(p - avg)));
        // Apply adjustments
        for (const t of targets) {
          const currentAdj = adjustments.get(t!.id) || { dx: 0, dy: 0, dw: 0, dh: 0 };
          if (axis === 0) currentAdj.dy += (avg - t!.y) * 0.3;
          else currentAdj.dx += (avg - t!.x) * 0.3;
          adjustments.set(t!.id, currentAdj);
        }
        return maxDev / 100;
      }
      case 'spacing': {
        const gap = constraint.params['gap'] || 16;
        const targets = constraint.elements.map(id => elMap.get(id)).filter(Boolean);
        if (targets.length < 2) return 0;
        let totalError = 0;
        for (let i = 1; i < targets.length; i++) {
          const actual = targets[i]!.x - (targets[i - 1]!.x + targets[i - 1]!.width);
          totalError += Math.abs(actual - gap);
        }
        return totalError / (gap * targets.length);
      }
      case 'proportion': {
        const ratio = constraint.params['ratio'] || 1.618; // Golden ratio
        const targets = constraint.elements.map(id => elMap.get(id)).filter(Boolean);
        if (targets.length < 1) return 0;
        const t = targets[0]!;
        const actual = t.width / Math.max(t.height, 1);
        return Math.abs(actual - ratio) / ratio;
      }
      default:
        return 0;
    }
  }

  private suggestFix(constraint: MCGEConstraint, energy: number): string {
    const fixes: Record<string, string> = {
      alignment: 'Align elements to common baseline',
      spacing: 'Adjust inter-element gaps to uniform spacing',
      proportion: 'Resize element to match target aspect ratio',
      symmetry: 'Mirror element positions across axis',
      containment: 'Resize container to fit all children',
    };
    return fixes[constraint.type] || 'Review constraint parameters';
  }
}
