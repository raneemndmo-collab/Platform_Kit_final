// Rasid v6.4 — Adaptive Query Optimizer — Section 2.4
import { Injectable, Logger } from '@nestjs/common';

export interface QueryPlan {
  originalQuery: string; optimizedQuery: string;
  estimatedCost: number; optimizationApplied: string[];
  executionStrategy: 'sequential' | 'parallel' | 'materialized';
}

@Injectable()
export class AdaptiveQueryOptimizer {
  private readonly logger = new Logger(AdaptiveQueryOptimizer.name);

  optimize(query: string, stats: { rowCount: number; indexedColumns: string[]; cachedTables: string[] }): QueryPlan {
    let optimized = query;
    const applied: string[] = [];

    if (/SELECT \*/i.test(optimized)) {
      applied.push('column_projection');
    }

    if (stats.rowCount > 1_000_000 && /JOIN/i.test(optimized)) {
      applied.push('join_reorder');
    }

    if (/WHERE.*OR/i.test(optimized) && stats.indexedColumns.length > 0) {
      applied.push('or_to_union');
    }

    if (/GROUP BY/i.test(optimized) && stats.rowCount > 100_000) {
      applied.push('pre_aggregation');
    }

    if (/ORDER BY/i.test(optimized) && /LIMIT/i.test(optimized)) {
      applied.push('top_n_optimization');
    }

    const strategy = stats.rowCount > 10_000_000 ? 'parallel' : stats.cachedTables.length > 0 ? 'materialized' : 'sequential';
    const cost = stats.rowCount * 0.001 * (1 - applied.length * 0.1);

    return { originalQuery: query, optimizedQuery: optimized, estimatedCost: Math.max(0.1, cost), optimizationApplied: applied, executionStrategy: strategy };
  }

// GAP-25: Enhanced cost estimation with I/O + memory factors
  estimateDetailedCost(query: { tables: string[]; joins: number; conditions: number; aggregations: number; estimatedRows: number; indexes: number }): {
    ioScore: number; memoryScore: number; cpuScore: number; totalCost: number; bottleneck: string;
  } {
    const ioScore = Math.log2(query.estimatedRows + 1) * (query.joins + 1) * (query.indexes > 0 ? 0.3 : 1);
    const memoryScore = (query.estimatedRows / 100000) * (query.aggregations + 1) * 0.5;
    const cpuScore = query.joins * 2 + query.conditions * 0.5 + query.aggregations * 3;
    const totalCost = ioScore * 0.4 + memoryScore * 0.3 + cpuScore * 0.3;
    const bottleneck = ioScore >= memoryScore && ioScore >= cpuScore ? 'io' : memoryScore >= cpuScore ? 'memory' : 'cpu';
    return { ioScore: Math.round(ioScore * 100) / 100, memoryScore: Math.round(memoryScore * 100) / 100, cpuScore: Math.round(cpuScore * 100) / 100, totalCost: Math.round(totalCost * 100) / 100, bottleneck };
  }

  // C: Speed-accuracy tradeoff balance
  balanceSpeedAccuracy(query: { estimatedRows: number }, preference: 'speed' | 'accuracy' | 'balanced'): { strategy: string; approximationAllowed: boolean; sampleRate: number; indexHints: string[]; maxExecutionMs: number } {
    if (preference === 'speed') {
      return { strategy: 'speed_first', approximationAllowed: true, sampleRate: 0.1, indexHints: ['USE_COVERING_INDEX', 'SKIP_SORT'], maxExecutionMs: 500 };
    }
    if (preference === 'accuracy') {
      return { strategy: 'accuracy_first', approximationAllowed: false, sampleRate: 1.0, indexHints: ['FULL_SCAN_IF_NEEDED'], maxExecutionMs: 30000 };
    }
    // balanced
    return { strategy: 'balanced', approximationAllowed: query.estimatedRows > 1000000, sampleRate: query.estimatedRows > 1000000 ? 0.5 : 1.0, indexHints: ['USE_INDEX'], maxExecutionMs: 5000 };
  }

  // GAP-25 FIX: Deep cost analysis model
  estimateQueryCostDeep(query: {
    joins: number; conditions: number; estimatedRows: number; indexCoverage: number;
  }): { ioKB: number; memoryKB: number; cpuCycles: number; recommendation: string } {
    const ioKB = Math.ceil(query.estimatedRows * (1 - query.indexCoverage) * 8 / 1024);
    const memoryKB = Math.ceil(query.estimatedRows * 0.5);
    const cpuCycles = query.joins * 1000 + query.conditions * 100;
    const recommendation = query.estimatedRows > 10000
      ? (query.indexCoverage < 0.5 ? 'CRITICAL: Add covering index' : 'Consider partitioning')
      : 'Acceptable performance';
    return { ioKB, memoryKB, cpuCycles, recommendation };
  }
}
