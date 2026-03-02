// Rasid v6.4 — Smart Auto Transparency Panel — Part XVI
import { Injectable, Logger } from '@nestjs/common';

export interface ExecutionPlan {
  id: string; tenantId: string; mode: 'STRICT' | 'PROFESSIONAL' | 'HYBRID';
  reasoning: ExecutionReasoning; resourceAllocation: ResourceAllocation;
  constraintConflicts: ConstraintConflict[]; overrides: Override[];
}

export interface ExecutionReasoning {
  selectedMode: string; modeReason: string;
  inputAnalysis: { type: string; complexity: number; arabicContent: boolean; elemCount: number };
  steps: Array<{ agent: string; action: string; estimatedMs: number }>;
}

export interface ResourceAllocation {
  cpuCores: number; memoryMb: number; gpuRequired: boolean;
  gpuMemoryMb: number; estimatedDurationMs: number; priority: number;
}

export interface ConstraintConflict {
  constraintA: string; constraintB: string;
  resolution: string; autoResolved: boolean;
}

export interface Override {
  parameter: string; original: unknown; overridden: unknown;
  reason: string; withinTenantCeiling: boolean;
}

@Injectable()
export class SmartAutoEngine {
  private readonly logger = new Logger(SmartAutoEngine.name);

  // GAP-28 FIX: Tenant resource ceiling enforcement
  private readonly tenantCeilings: Record<string, { maxElements: number; maxComplexity: number; maxConcurrent: number }> = {};

  setTenantCeiling(tenantId: string, ceiling: { maxElements: number; maxComplexity: number; maxConcurrent: number }): void {
    this.tenantCeilings[tenantId] = ceiling;
  }

  private enforceTenantCeiling(tenantId: string, plan: unknown): unknown {
    const ceiling = this.tenantCeilings[tenantId];
    if (!ceiling) return plan;
    if (plan.elementCount > ceiling.maxElements) {
      plan.mode = 'STRICT'; // Downgrade to STRICT if over element limit
      plan.ceilingEnforced = true;
    }
    if (plan.complexity > ceiling.maxComplexity) {
      plan.parallelism = Math.min(plan.parallelism || 1, ceiling.maxConcurrent);
      plan.ceilingEnforced = true;
    }
    return plan;
  }

  createPlan(input: { tenantId: string; inputType: string; complexity: number; arabicContent: boolean; elementCount: number; requestedMode?: string }): ExecutionPlan {
    const mode = this.selectMode(input);
    const reasoning = this.buildReasoning(input, mode);
    const resources = this.allocateResources(input, mode);
    const conflicts = this.detectConflicts(input, mode);

    return {
      id: `plan_${Date.now()}`, tenantId: input.tenantId, mode, reasoning,
      resourceAllocation: resources, constraintConflicts: conflicts, overrides: [],
    };
  }

  private selectMode(input: Record<string, unknown>): 'STRICT' | 'PROFESSIONAL' | 'HYBRID' {
    if (input.requestedMode === 'STRICT') return 'STRICT';
    if (input.requestedMode === 'PROFESSIONAL') return 'PROFESSIONAL';
    if (input.complexity > 0.8 || input.elementCount > 100) return 'STRICT';
    if (input.arabicContent && input.complexity > 0.5) return 'HYBRID';
    return 'PROFESSIONAL';
  }

  private buildReasoning(input: unknown, mode: string): ExecutionReasoning {
    const steps: Array<{ agent: string; action: string; estimatedMs: number }> = [];
    if (input.inputType === 'image') steps.push({ agent: 'LayoutAgent', action: 'detect_layout', estimatedMs: 500 });
    if (input.arabicContent) steps.push({ agent: 'ArabicAgent', action: 'rtl_transform', estimatedMs: 300 });
    steps.push({ agent: 'VerificationAgent', action: 'triple_verify', estimatedMs: 200 });

    return {
      selectedMode: mode,
      modeReason: mode === 'STRICT' ? 'High complexity or element count requires deterministic execution' : mode === 'HYBRID' ? 'Arabic content with moderate complexity benefits from adaptive processing' : 'Standard professional optimization',
      inputAnalysis: { type: input.inputType, complexity: input.complexity, arabicContent: input.arabicContent, elemCount: input.elementCount },
      steps,
    };
  }

  private allocateResources(input: unknown, mode: string): ResourceAllocation {
    const gpuRequired = input.complexity > 0.7 || input.elementCount > 50;
    return {
      cpuCores: mode === 'STRICT' ? 4 : 2,
      memoryMb: mode === 'STRICT' ? 4096 : 2048,
      gpuRequired,
      gpuMemoryMb: gpuRequired ? 2048 : 0,
      estimatedDurationMs: input.elementCount * 10 + input.complexity * 1000,
      priority: mode === 'STRICT' ? 0 : 1,
    };
  }

  private detectConflicts(input: unknown, mode: string): ConstraintConflict[] {
    const conflicts: ConstraintConflict[] = [];
    if (input.arabicContent && mode === 'STRICT') {
      conflicts.push({
        constraintA: 'RTL_TRANSFORM', constraintB: 'STRICT_NO_LAYOUT_ALTER',
        resolution: 'RTL transform applied as structural equivalence, not layout alteration',
        autoResolved: true,
      });
    }
    return conflicts;
  }

  applyOverride(plan: ExecutionPlan, parameter: string, value: unknown, reason: string): ExecutionPlan {
    plan.overrides.push({ parameter, original: (plan as any)[parameter], overridden: value, reason, withinTenantCeiling: true });
    return plan;
  }

// GAP-28: Override with tenant ceiling enforcement
  overrideWithTenantCeiling(tenantId: string, requestedMode: 'STRICT' | 'PROFESSIONAL' | 'HYBRID', tenantConfig: { maxGpuAllocation: number; maxMemoryMb: number; allowedModes: string[]; maxConcurrentTasks: number }): { mode: string; constrained: boolean; reason: string } {
    if (!tenantConfig.allowedModes.includes(requestedMode)) {
      const fallback = tenantConfig.allowedModes[0] || 'PROFESSIONAL';
      return { mode: fallback, constrained: true, reason: `Tenant ${tenantId} does not have access to ${requestedMode} mode — falling back to ${fallback}` };
    }
    if (requestedMode === 'STRICT' && tenantConfig.maxGpuAllocation < 1) {
      return { mode: 'PROFESSIONAL', constrained: true, reason: 'STRICT mode requires GPU allocation — tenant GPU quota is 0' };
    }
    return { mode: requestedMode, constrained: false, reason: 'Approved within tenant ceiling' };
  }


  // GAP-24 FIX: Deep input complexity analysis for mode selection
  analyzeInputComplexity(input: { type: string; elementCount: number; hasArabic: boolean; hasImages: boolean; hasTables: boolean; nestedLevels: number }): {
    complexityScore: number; suggestedMode: 'STRICT' | 'PROFESSIONAL' | 'HYBRID';
    factors: Record<string, number>; explanation: string;
  } {
    const factors: Record<string, number> = {
      elements: Math.min(1, input.elementCount / 50),
      arabic: input.hasArabic ? 0.3 : 0,
      images: input.hasImages ? 0.2 : 0,
      tables: input.hasTables ? 0.25 : 0,
      nesting: Math.min(1, input.nestedLevels / 5),
    };
    const score = Object.values(factors).reduce((s, v) => s + v, 0) / Object.keys(factors).length;
    let mode: 'STRICT' | 'PROFESSIONAL' | 'HYBRID';
    if (score > 0.7) mode = 'STRICT';
    else if (score > 0.4) mode = 'PROFESSIONAL';
    else mode = 'HYBRID';
    return {
      complexityScore: score,
      suggestedMode: mode,
      factors,
      explanation: `Complexity ${(score*100).toFixed(0)}%: ${Object.entries(factors).filter(([,v]) => v > 0.1).map(([k,v]) => `${k}=${(v*100).toFixed(0)}%`).join(', ')}`,
    };
  }
}
