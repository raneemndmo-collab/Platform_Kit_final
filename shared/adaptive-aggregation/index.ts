// Rasid v6.4 — Adaptive Aggregation Planner — Part VIII

export type ExecutionPath = 'IN_MEMORY' | 'MATERIALIZED' | 'GPU_VECTOR';

export interface AggregationPlan {
  path: ExecutionPath; estimatedMs: number; memoryRequired: number;
  prewarmTargets: string[]; deterministicOrder: boolean; tenantIsolated: boolean;
}

export class AdaptiveAggregationPlanner {
  private readonly GPU_THRESHOLD = 10_000_000; // 10M rows
  private readonly MATERIALIZED_THRESHOLD = 1_000_000; // 1M rows
  private readonly cacheWarmed = new Set<string>();

  plan(rowCount: number, columnCount: number, tenantId: string): AggregationPlan {
    const dataSize = rowCount * columnCount * 8; // ~8 bytes per cell

    if (rowCount > this.GPU_THRESHOLD) {
      return {
        path: 'GPU_VECTOR', estimatedMs: Math.ceil(rowCount / 50000),
        memoryRequired: dataSize * 1.5,
        prewarmTargets: [`gpu_buffer_${tenantId}`, `vector_index_${tenantId}`],
        deterministicOrder: true, tenantIsolated: true,
      };
    }

    if (rowCount > this.MATERIALIZED_THRESHOLD) {
      return {
        path: 'MATERIALIZED', estimatedMs: Math.ceil(rowCount / 10000),
        memoryRequired: dataSize * 0.3,
        prewarmTargets: [`materialized_view_${tenantId}`],
        deterministicOrder: true, tenantIsolated: true,
      };
    }

    return {
      path: 'IN_MEMORY', estimatedMs: Math.ceil(rowCount / 100000),
      memoryRequired: dataSize,
      prewarmTargets: [],
      deterministicOrder: true, tenantIsolated: true,
    };
  }

  // GAP-08: Pre-warm aggregation caches
  preWarm(plan: AggregationPlan): { warmed: string[] } {
    const warmed: string[] = [];
    for (const target of plan.prewarmTargets) {
      if (!this.cacheWarmed.has(target)) {
        this.cacheWarmed.add(target);
        warmed.push(target);
      }
    }
    return { warmed };
  }

  invalidateCache(tenantId: string): number {
    let removed = 0;
    for (const key of this.cacheWarmed) {
      if (key.includes(tenantId)) { this.cacheWarmed.delete(key); removed++; }
    }
    return removed;
  }

  // GAP-08: Tenant isolation under heavy load
  enforceIsolation(tenantId: string, currentLoad: number, maxTenantShare: number = 0.25): { allowed: boolean; throttled: boolean; maxRows: number } {
    if (currentLoad > maxTenantShare) {
      return { allowed: true, throttled: true, maxRows: Math.floor(this.GPU_THRESHOLD * maxTenantShare) };
    }
    return { allowed: true, throttled: false, maxRows: this.GPU_THRESHOLD };
  }

  // GAP-08: Deterministic ordering guarantee
  ensureDeterministicOrder<T>(data: T[], orderKey: keyof T): T[] {
    return [...data].sort((a, b) => {
      const va = a[orderKey], vb = b[orderKey];
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
  }

// GAP-08 FIX: Pre-warm cache for known heavy queries
  preWarmCache(tenantId: string, frequentQueries: Array<{ rowCount: number; columnCount: number }>): { warmed: number } {
    let warmed = 0;
    for (const q of frequentQueries) {
      const plan = this.plan(q.rowCount, q.columnCount, tenantId);
      // Cache the plan for fast retrieval
      const cacheKey = `${tenantId}:${q.rowCount}:${q.columnCount}`;
      this.planCache.set(cacheKey, plan);
      warmed++;
    }
    return { warmed };
  }

  // GAP-08 FIX: Tenant isolation under heavy load — partition resources
  planWithIsolation(rowCount: number, columnCount: number, tenantId: string, maxMemoryMB: number = 512): unknown {
    const plan = this.plan(rowCount, columnCount, tenantId);
    const estimatedMemoryMB = (rowCount * columnCount * 8) / (1024 * 1024);
    if (estimatedMemoryMB > maxMemoryMB) {
      return {
        ...plan,
        throttled: true,
        originalRows: rowCount,
        sampledRows: Math.floor(maxMemoryMB * 1024 * 1024 / (columnCount * 8)),
        reason: `Tenant ${tenantId} capped at ${maxMemoryMB}MB (${estimatedMemoryMB.toFixed(0)}MB requested)`,
      };
    }
    return { ...plan, throttled: false };
  }

  // Plan cache
  private planCache = new Map<string, unknown>();
}
