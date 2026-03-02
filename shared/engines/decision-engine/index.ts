// ═══════════════════════════════════════════════════════════════════════════════
// محرك اتخاذ القرار — Decision Engine
// رصيد v6.4 — قرارات ذكية مبنية على البيانات مع عزل المستأجر
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export interface DecisionContext {
  tenantId: string;
  type: string;
  input: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface DecisionResult {
  id: string;
  tenantId: string;
  decision: string;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{ decision: string; score: number; tradeoffs: string[] }>;
  metadata: { processingTimeMs: number; rulesEvaluated: number; dataPointsUsed: number };
}

export interface DecisionPolicy {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  rules: Array<{ condition: string; weight: number; action: string }>;
  defaultAction: string;
  version: number;
}

@Injectable()
export class DecisionEngine {
  private readonly logger = new Logger(DecisionEngine.name);
  private readonly policies = new BoundedMap<string, DecisionPolicy[]>(5000);
  private readonly decisionHistory = new BoundedMap<string, DecisionResult[]>(50000);

  registerPolicy(policy: DecisionPolicy): DecisionPolicy {
    this.logger.log(`تسجيل سياسة: ${policy.name} tenant=${policy.tenantId}`);
    const tenantPolicies = this.policies.get(policy.tenantId) || [];
    tenantPolicies.push(policy);
    this.policies.set(policy.tenantId, tenantPolicies);
    return policy;
  }

  async evaluate(context: DecisionContext): Promise<DecisionResult> {
    const startTime = Date.now();
    this.logger.log(`تقييم قرار: type=${context.type} tenant=${context.tenantId}`);

    const policies = (this.policies.get(context.tenantId) || []).filter(p => p.type === context.type);
    const scores = new Map<string, number>();
    const reasoning: string[] = [];
    let rulesEvaluated = 0;

    for (const policy of policies) {
      for (const rule of policy.rules) {
        rulesEvaluated++;
        const matched = this.evaluateCondition(rule.condition, context.input);
        if (matched) {
          const current = scores.get(rule.action) || 0;
          scores.set(rule.action, current + rule.weight);
          reasoning.push(`قاعدة "${rule.condition}" → ${rule.action} (وزن: ${rule.weight})`);
        }
      }
    }

    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const topDecision = sorted[0]?.[0] || policies[0]?.defaultAction || 'no_action';
    const topScore = sorted[0]?.[1] || 0;
    const maxPossible = policies.reduce((s, p) => s + p.rules.reduce((rs, r) => rs + r.weight, 0), 0) || 1;

    const result: DecisionResult = {
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: context.tenantId,
      decision: topDecision,
      confidence: topScore / maxPossible,
      reasoning,
      alternatives: sorted.slice(1, 4).map(([decision, score]) => ({
        decision, score: score / maxPossible,
        tradeoffs: [`أقل ثقة بنسبة ${Math.round((1 - score / maxPossible) * 100)}%`],
      })),
      metadata: { processingTimeMs: Date.now() - startTime, rulesEvaluated, dataPointsUsed: Object.keys(context.input).length },
    };

    const history = this.decisionHistory.get(context.tenantId) || [];
    history.push(result);
    if (history.length > 100) history.shift();
    this.decisionHistory.set(context.tenantId, history);
    return result;
  }

  private evaluateCondition(condition: string, input: Record<string, unknown>): boolean {
    try {
      const parts = condition.split(/\s+/);
      if (parts.length === 3) {
        const [field, op, value] = parts;
        const actual = input[field];
        switch (op) {
          case '==': return String(actual) === value;
          case '!=': return String(actual) !== value;
          case '>': return Number(actual) > Number(value);
          case '<': return Number(actual) < Number(value);
          case '>=': return Number(actual) >= Number(value);
          case '<=': return Number(actual) <= Number(value);
        }
      }
      return field in input;
    } catch { return false; }
  }

  getHistory(tenantId: string): DecisionResult[] {
    return this.decisionHistory.get(tenantId) || [];
  }
}
