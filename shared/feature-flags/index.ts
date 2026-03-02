// =============================================================================
import { BoundedMap } from '../bounded-collections';
// Rasid Platform v6.2 — Feature Flags Runtime Engine
// Constitutional Reference: Part 35 (FFG-001 — FFG-008)
// Progressive rollout, A/B testing, flag hygiene
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

export enum FlagStatus { ACTIVE = 'active', INACTIVE = 'inactive', ARCHIVED = 'archived' }
export enum RolloutStrategy { ALL = 'all', PERCENTAGE = 'percentage', TENANT_LIST = 'tenant_list', ATTRIBUTE = 'attribute' }

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  status: FlagStatus;
  rolloutStrategy: RolloutStrategy;
  rolloutPercentage?: number;
  allowedTenants?: string[];
  attributeRules?: AttributeRule[];
  createdAt: string;
  expiresAt?: string; // FFG-008: Flag hygiene — flags MUST have expiry
  owner: string;
  tags: string[];
}

export interface AttributeRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'gt' | 'lt';
  value: unknown;
}

export interface FlagEvaluationContext {
  tenantId: string;
  userId?: string;
  attributes?: Record<string, unknown>;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private flags: Map<string, FeatureFlag> = new BoundedMap<unknown, unknown>(10_000);

  /**
   * Evaluate if a feature flag is enabled for given context
   * FFG-002: Flag evaluation MUST be deterministic for same inputs
   */
  isEnabled(flagKey: string, context: FlagEvaluationContext): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag || flag.status !== FlagStatus.ACTIVE) return false;

    // FFG-008: Expired flags treated as inactive
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
      this.logger.warn(`Flag ${flagKey} has expired — treating as inactive`);
      return false;
    }

    switch (flag.rolloutStrategy) {
      case RolloutStrategy.ALL:
        return true;
      case RolloutStrategy.PERCENTAGE:
        return this.evaluatePercentage(flag, context);
      case RolloutStrategy.TENANT_LIST:
        return flag.allowedTenants?.includes(context.tenantId) ?? false;
      case RolloutStrategy.ATTRIBUTE:
        return this.evaluateAttributes(flag, context);
      default:
        return false;
    }
  }

  /**
   * Progressive rollout: deterministic hash-based percentage
   * FFG-003: Same tenant+flag always gets same result
   */
  private evaluatePercentage(flag: FeatureFlag, context: FlagEvaluationContext): boolean {
    const hash = this.deterministicHash(`${flag.key}:${context.tenantId}`);
    return (hash % 100) < (flag.rolloutPercentage ?? 0);
  }

  private evaluateAttributes(flag: FeatureFlag, context: FlagEvaluationContext): boolean {
    if (!flag.attributeRules || !context.attributes) return false;
    return flag.attributeRules.every(rule => {
      const value = context.attributes?.[rule.attribute];
      switch (rule.operator) {
        case 'eq': return value === rule.value;
        case 'neq': return value !== rule.value;
        case 'in': return Array.isArray(rule.value) && rule.value.includes(value);
        case 'gt': return value > rule.value;
        case 'lt': return value < rule.value;
        default: return false;
      }
    });
  }

  private deterministicHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  registerFlag(flag: FeatureFlag): void { this.flags.set(flag.key, flag); }
  removeFlag(key: string): void { this.flags.delete(key); }
  getFlag(key: string): FeatureFlag | undefined { return this.flags.get(key); }
  getAllFlags(): FeatureFlag[] { return Array.from(this.flags.values()); }

  /**
   * FFG-008: Flag hygiene — find expired or stale flags
   */
  getStaleFlags(maxAgeDays: number = 90): FeatureFlag[] {
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();
    return this.getAllFlags().filter(f => f.createdAt < cutoff && f.status === FlagStatus.ACTIVE);
  }
}
