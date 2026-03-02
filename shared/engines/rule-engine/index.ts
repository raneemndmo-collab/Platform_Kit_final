// ═══════════════════════════════════════════════════════════════════════════════
// محرك القواعد — Rule Engine
// رصيد v6.4 — تقييم القواعد الديناميكية مع عزل المستأجر
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex' | 'between';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
  logicalOp?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'set_field' | 'emit_event' | 'notify' | 'block' | 'approve' | 'escalate' | 'transform';
  target: string;
  value: unknown;
  metadata?: Record<string, unknown>;
}

export interface Rule {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  version: number;
  createdAt: Date;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  actions: RuleAction[];
  executionTimeMs: number;
  conditionResults: Array<{ field: string; matched: boolean; actualValue: unknown }>;
}

export interface RuleSetResult {
  tenantId: string;
  totalRules: number;
  matchedRules: number;
  executedActions: RuleAction[];
  results: RuleEvaluationResult[];
  totalTimeMs: number;
}

@Injectable()
export class RuleEngine {
  private readonly logger = new Logger(RuleEngine.name);
  private readonly ruleCache = new BoundedMap<string, Rule[]>(10000);
  private readonly evaluationHistory = new BoundedMap<string, RuleSetResult[]>(50000);

  /** تسجيل قاعدة جديدة */
  registerRule(rule: Rule): void {
    this.logger.log(`تسجيل قاعدة: ${rule.name} tenant=${rule.tenantId}`);
    const tenantRules = this.ruleCache.get(rule.tenantId) || [];
    const existingIdx = tenantRules.findIndex(r => r.id === rule.id);
    if (existingIdx >= 0) {
      tenantRules[existingIdx] = rule;
    } else {
      tenantRules.push(rule);
    }
    tenantRules.sort((a, b) => b.priority - a.priority);
    this.ruleCache.set(rule.tenantId, tenantRules);
  }

  /** تقييم جميع القواعد على بيانات معينة */
  evaluate(tenantId: string, data: Record<string, unknown>): RuleSetResult {
    const startTime = Date.now();
    const rules = (this.ruleCache.get(tenantId) || []).filter(r => r.enabled);
    this.logger.log(`تقييم ${rules.length} قاعدة: tenant=${tenantId}`);

    const results: RuleEvaluationResult[] = [];
    const executedActions: RuleAction[] = [];

    for (const rule of rules) {
      const ruleStart = Date.now();
      const conditionResults = this.evaluateConditions(rule.conditions, data);
      const allMatched = this.checkLogicalCombination(rule.conditions, conditionResults);

      const result: RuleEvaluationResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: allMatched,
        actions: allMatched ? rule.actions : [],
        executionTimeMs: Date.now() - ruleStart,
        conditionResults,
      };
      results.push(result);

      if (allMatched) {
        executedActions.push(...rule.actions);
      }
    }

    const setResult: RuleSetResult = {
      tenantId,
      totalRules: rules.length,
      matchedRules: results.filter(r => r.matched).length,
      executedActions,
      results,
      totalTimeMs: Date.now() - startTime,
    };

    // حفظ في التاريخ
    const history = this.evaluationHistory.get(tenantId) || [];
    history.push(setResult);
    if (history.length > 100) history.shift();
    this.evaluationHistory.set(tenantId, history);

    return setResult;
  }

  private evaluateConditions(
    conditions: RuleCondition[],
    data: Record<string, unknown>,
  ): Array<{ field: string; matched: boolean; actualValue: unknown }> {
    return conditions.map(cond => {
      const actualValue = this.getNestedValue(data, cond.field);
      const matched = this.evaluateOperator(cond.operator, actualValue, cond.value);
      return { field: cond.field, matched, actualValue };
    });
  }

  private checkLogicalCombination(
    conditions: RuleCondition[],
    results: Array<{ matched: boolean }>,
  ): boolean {
    if (results.length === 0) return false;
    let result = results[0].matched;
    for (let i = 1; i < conditions.length; i++) {
      const op = conditions[i].logicalOp || 'AND';
      if (op === 'AND') result = result && results[i].matched;
      else result = result || results[i].matched;
    }
    return result;
  }

  private evaluateOperator(op: RuleOperator, actual: unknown, expected: unknown): boolean {
    switch (op) {
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      case 'gt': return Number(actual) > Number(expected);
      case 'gte': return Number(actual) >= Number(expected);
      case 'lt': return Number(actual) < Number(expected);
      case 'lte': return Number(actual) <= Number(expected);
      case 'in': return Array.isArray(expected) && expected.includes(actual);
      case 'contains': return String(actual).includes(String(expected));
      case 'regex': return new RegExp(String(expected)).test(String(actual));
      case 'between': {
        const [min, max] = expected as [number, number];
        const val = Number(actual);
        return val >= min && val <= max;
      }
      default: return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((o: any, k) => o?.[k], obj);
  }

  /** الحصول على تاريخ التقييم */
  getHistory(tenantId: string): RuleSetResult[] {
    return this.evaluationHistory.get(tenantId) || [];
  }
}
