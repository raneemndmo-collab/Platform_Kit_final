// =============================================================================
// D11: Design Constraint Solver — Layout Constraint Resolution
// Constitutional Reference: Part 21, Cluster: DPC
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DesignConstraint {
  id: string;
  type: 'position' | 'size' | 'spacing' | 'alignment' | 'proportion' | 'containment';
  targetElement: string;
  rule: string;
  priority: number;
  value: unknown;
}

export interface ConstraintSolution {
  feasible: boolean;
  satisfiedConstraints: number;
  totalConstraints: number;
  violations: { constraintId: string; severity: number; suggestion: string }[];
  adjustments: { elementId: string; property: string; oldValue: unknown; newValue: unknown }[];
}

@Injectable()
export class DesignConstraintService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(DesignConstraintService.name);

  constructor(
    @InjectRepository('ConstraintEntity') private constraintRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async solveConstraints(tenantId: string, dto: {
    cdrId: string; constraints: DesignConstraint[]; layoutLayer: unknown;
  }): Promise<ConstraintSolution> {
    const sorted = [...dto.constraints].sort((a, b) => b.priority - a.priority);
    const violations: ConstraintSolution['violations'] = [];
    const adjustments: ConstraintSolution['adjustments'] = [];
    let satisfied = 0;

    for (const constraint of sorted) {
      const element = (dto.layoutLayer?.elements || []).find((e: unknown) => e.id === constraint.targetElement);
      if (!element) { violations.push({ constraintId: constraint.id, severity: 0.5, suggestion: 'Target element not found' }); continue; }

      const result = this.evaluateConstraint(constraint, element);
      if (result.satisfied) { satisfied++; }
      else {
        violations.push({ constraintId: constraint.id, severity: result.severity, suggestion: result.suggestion });
        if (result.adjustment) adjustments.push(result.adjustment);
      }
    }

    const solution: ConstraintSolution = {
      feasible: violations.reduce((___c, v) => (v.severity > 0.8) ? ___c + 1 : ___c, 0) === 0,
      satisfiedConstraints: satisfied, totalConstraints: sorted.length,
      violations, adjustments,
    };

    await this.constraintRepo.save({ tenantId, cdrId: dto.cdrId, solutionJson: JSON.stringify(solution), feasible: solution.feasible });
    return solution;
  }

  private evaluateConstraint(constraint: DesignConstraint, element: unknown): {
    satisfied: boolean; severity: number; suggestion: string; adjustment?: unknown;
  } {
    switch (constraint.type) {
      case 'size':
        const minW = constraint.value?.minWidth || 0;
        const ok = (element.width || 0) >= minW;
        return { satisfied: ok, severity: ok ? 0 : 0.6, suggestion: ok ? '' : `Increase width to ${minW}`,
          adjustment: ok ? undefined : { elementId: element.id, property: 'width', oldValue: element.width, newValue: minW } };
      case 'spacing':
        return { satisfied: true, severity: 0, suggestion: '' };
      default:
        return { satisfied: true, severity: 0, suggestion: '' };
    }
  }
}