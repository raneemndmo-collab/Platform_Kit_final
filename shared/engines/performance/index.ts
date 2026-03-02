// ═══════════════════════════════════════════════════════════════════════════════
// تحسينات الأداء — Performance Optimizations
// رصيد v6.4 — ترقيم صفحات + إدارة ذاكرة + معالجة بيانات ضخمة + مهلة استعلام
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

// ─── ترقيم صفحات عام ────────────────────────────────────────────────────────
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
  };
  performance: {
    queryTimeMs: number;
    rowsScanned: number;
    cacheHit: boolean;
  };
}

// ─── إدارة الذاكرة ──────────────────────────────────────────────────────────
export interface MemoryBudget {
  maxHeapMB: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  gcIntervalMs: number;
}

export interface MemoryStats {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMemoryMB: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'critical';
}

// ─── مهلة الاستعلام ─────────────────────────────────────────────────────────
export interface QueryTimeout {
  defaultMs: number;
  maxMs: number;
  perTenantOverrides: Record<string, number>;
}

// ─── معالجة البيانات الضخمة ──────────────────────────────────────────────────
export interface StreamConfig {
  batchSize: number;
  maxConcurrent: number;
  backpressureThreshold: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface BatchResult<T> {
  batchIndex: number;
  items: T[];
  processedCount: number;
  errorCount: number;
  durationMs: number;
}

export interface StreamProgress {
  totalRows: number;
  processedRows: number;
  failedRows: number;
  currentBatch: number;
  totalBatches: number;
  percentComplete: number;
  estimatedRemainingMs: number;
  startedAt: Date;
  throughputPerSecond: number;
}

@Injectable()
export class PerformanceOptimizer {
  private readonly logger = new Logger(PerformanceOptimizer.name);
  private readonly queryCache = new BoundedMap<string, { data: unknown; cachedAt: number; ttlMs: number }>(10000);
  private readonly memoryBudget: MemoryBudget = {
    maxHeapMB: 512,
    warningThresholdPercent: 70,
    criticalThresholdPercent: 90,
    gcIntervalMs: 60000,
  };
  private readonly queryTimeout: QueryTimeout = {
    defaultMs: 30000,
    maxMs: 120000,
    perTenantOverrides: {},
  };

  // ─── ترقيم صفحات ──────────────────────────────────────────────────────
  paginate<T>(items: T[], options: PaginationOptions): PaginatedResult<T> {
    const start = Date.now();
    const { page, pageSize, sortBy, sortOrder } = options;

    let sorted = [...items];
    if (sortBy) {
      sorted.sort((a: any, b: any) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    const total = sorted.length;
    const totalPages = Math.ceil(total / pageSize);
    const safePage = Math.max(1, Math.min(page, totalPages || 1));
    const startIdx = (safePage - 1) * pageSize;
    const data = sorted.slice(startIdx, startIdx + pageSize);

    return {
      data,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrevious: safePage > 1,
      },
      performance: {
        queryTimeMs: Date.now() - start,
        rowsScanned: total,
        cacheHit: false,
      },
    };
  }

  // ─── ترقيم بالمؤشر (Cursor) ───────────────────────────────────────────
  cursorPaginate<T extends Record<string, any>>(
    items: T[],
    cursor: string | undefined,
    pageSize: number,
    cursorField: string = 'id',
  ): { data: T[]; nextCursor?: string; hasMore: boolean } {
    let startIdx = 0;
    if (cursor) {
      const idx = items.findIndex(item => String(item[cursorField]) === cursor);
      startIdx = idx >= 0 ? idx + 1 : 0;
    }
    const data = items.slice(startIdx, startIdx + pageSize);
    const hasMore = startIdx + pageSize < items.length;
    const nextCursor = hasMore && data.length > 0 ? String(data[data.length - 1][cursorField]) : undefined;
    return { data, nextCursor, hasMore };
  }

  // ─── إدارة الذاكرة ────────────────────────────────────────────────────
  getMemoryStats(): MemoryStats {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100;
    const externalMB = Math.round(mem.external / 1024 / 1024 * 100) / 100;
    const rssMemoryMB = Math.round(mem.rss / 1024 / 1024 * 100) / 100;
    const usagePercent = Math.round((heapUsedMB / this.memoryBudget.maxHeapMB) * 100);

    let status: MemoryStats['status'] = 'normal';
    if (usagePercent >= this.memoryBudget.criticalThresholdPercent) status = 'critical';
    else if (usagePercent >= this.memoryBudget.warningThresholdPercent) status = 'warning';

    return { heapUsedMB, heapTotalMB, externalMB, rssMemoryMB, usagePercent, status };
  }

  checkMemoryBudget(): boolean {
    const stats = this.getMemoryStats();
    if (stats.status === 'critical') {
      this.logger.error(`CRITICAL: Memory usage at ${stats.usagePercent}% (${stats.heapUsedMB}MB / ${this.memoryBudget.maxHeapMB}MB)`);
      this.evictCache(50);
      return false;
    }
    if (stats.status === 'warning') {
      this.logger.warn(`WARNING: Memory usage at ${stats.usagePercent}% (${stats.heapUsedMB}MB)`);
      this.evictCache(20);
    }
    return true;
  }

  private evictCache(percentToEvict: number): void {
    const totalEntries = this.queryCache.size;
    const toEvict = Math.ceil(totalEntries * percentToEvict / 100);
    let evicted = 0;
    this.queryCache.forEach((_, key) => {
      if (evicted < toEvict) {
        this.queryCache.delete(key);
        evicted++;
      }
    });
    this.logger.log(`Evicted ${evicted} cache entries`);
  }

  // ─── مهلة الاستعلام ───────────────────────────────────────────────────
  getQueryTimeout(tenantId?: string): number {
    if (tenantId && this.queryTimeout.perTenantOverrides[tenantId]) {
      return Math.min(this.queryTimeout.perTenantOverrides[tenantId], this.queryTimeout.maxMs);
    }
    return this.queryTimeout.defaultMs;
  }

  async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
      fn().then(result => { clearTimeout(timer); resolve(result); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  // ─── معالجة دفعية للبيانات الضخمة ─────────────────────────────────────
  async processBatches<T, R>(
    items: T[],
    processor: (batch: T[], batchIndex: number) => Promise<R[]>,
    config: StreamConfig = { batchSize: 1000, maxConcurrent: 3, backpressureThreshold: 10000, retryAttempts: 3, retryDelayMs: 1000 },
    onProgress?: (progress: StreamProgress) => void,
  ): Promise<{ results: R[]; progress: StreamProgress }> {
    const totalRows = items.length;
    const totalBatches = Math.ceil(totalRows / config.batchSize);
    const startedAt = new Date();
    const allResults: R[] = [];
    let processedRows = 0;
    let failedRows = 0;

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const start = batchIdx * config.batchSize;
      const batch = items.slice(start, start + config.batchSize);

      let batchResults: R[] = [];
      let attempt = 0;
      let success = false;

      while (attempt < config.retryAttempts && !success) {
        try {
          // فحص الذاكرة قبل كل دفعة
          this.checkMemoryBudget();
          batchResults = await processor(batch, batchIdx);
          success = true;
        } catch (err) {
          attempt++;
          if (attempt < config.retryAttempts) {
            await new Promise(r => setTimeout(r, config.retryDelayMs * attempt));
          } else {
            failedRows += batch.length;
            this.logger.error(`Batch ${batchIdx} failed after ${config.retryAttempts} attempts`);
          }
        }
      }

      allResults.push(...batchResults);
      processedRows += batch.length;

      const elapsedMs = Date.now() - startedAt.getTime();
      const throughput = elapsedMs > 0 ? (processedRows / elapsedMs) * 1000 : 0;
      const remainingRows = totalRows - processedRows;
      const estimatedRemainingMs = throughput > 0 ? (remainingRows / throughput) * 1000 : 0;

      const progress: StreamProgress = {
        totalRows,
        processedRows,
        failedRows,
        currentBatch: batchIdx + 1,
        totalBatches,
        percentComplete: Math.round((processedRows / totalRows) * 100),
        estimatedRemainingMs: Math.round(estimatedRemainingMs),
        startedAt,
        throughputPerSecond: Math.round(throughput),
      };

      if (onProgress) onProgress(progress);
    }

    const finalProgress: StreamProgress = {
      totalRows,
      processedRows,
      failedRows,
      currentBatch: totalBatches,
      totalBatches,
      percentComplete: 100,
      estimatedRemainingMs: 0,
      startedAt,
      throughputPerSecond: Math.round(processedRows / ((Date.now() - startedAt.getTime()) / 1000)),
    };

    return { results: allResults, progress: finalProgress };
  }

  // ─── تخزين مؤقت للاستعلامات ───────────────────────────────────────────
  getCached<T>(key: string): T | null {
    const entry = this.queryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.queryCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  setCache(key: string, data: unknown, ttlMs: number = 60000): void {
    this.queryCache.set(key, { data, cachedAt: Date.now(), ttlMs });
  }

  invalidateCache(pattern: string): number {
    let count = 0;
    this.queryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
        count++;
      }
    });
    return count;
  }

  // ─── مقاييس الأداء ────────────────────────────────────────────────────
  measureExecution<T>(label: string, fn: () => T): { result: T; durationMs: number } {
    const start = process.hrtime.bigint();
    const result = fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    this.logger.debug(`[${label}] executed in ${durationMs.toFixed(2)}ms`);
    return { result, durationMs };
  }

  async measureAsyncExecution<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    this.logger.debug(`[${label}] executed in ${durationMs.toFixed(2)}ms`);
    return { result, durationMs };
  }
}
