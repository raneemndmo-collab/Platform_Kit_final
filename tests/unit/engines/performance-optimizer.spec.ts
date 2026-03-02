// اختبارات وحدة — تحسينات الأداء
import { PerformanceOptimizer } from '../../../shared/engines/performance';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
  });

  describe('Pagination', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, score: Math.random() * 100 }));

    it('should paginate first page correctly', () => {
      const result = optimizer.paginate(items, { page: 1, pageSize: 10 });
      expect(result.data).toHaveLength(10);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrevious).toBe(false);
    });

    it('should paginate last page correctly', () => {
      const result = optimizer.paginate(items, { page: 10, pageSize: 10 });
      expect(result.data).toHaveLength(10);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrevious).toBe(true);
    });

    it('should sort ascending', () => {
      const result = optimizer.paginate(items, { page: 1, pageSize: 5, sortBy: 'id', sortOrder: 'asc' });
      expect(result.data[0].id).toBe(1);
      expect(result.data[4].id).toBe(5);
    });

    it('should sort descending', () => {
      const result = optimizer.paginate(items, { page: 1, pageSize: 5, sortBy: 'id', sortOrder: 'desc' });
      expect(result.data[0].id).toBe(100);
    });

    it('should handle out-of-range page', () => {
      const result = optimizer.paginate(items, { page: 999, pageSize: 10 });
      expect(result.pagination.page).toBe(10);
    });

    it('should include performance metrics', () => {
      const result = optimizer.paginate(items, { page: 1, pageSize: 10 });
      expect(result.performance.queryTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.performance.rowsScanned).toBe(100);
    });
  });

  describe('Cursor Pagination', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: `id-${i + 1}`, name: `Item ${i + 1}` }));

    it('should return first page without cursor', () => {
      const result = optimizer.cursorPaginate(items, undefined, 5);
      expect(result.data).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('id-5');
    });

    it('should return next page with cursor', () => {
      const result = optimizer.cursorPaginate(items, 'id-5', 5);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].id).toBe('id-6');
    });

    it('should handle last page', () => {
      const result = optimizer.cursorPaginate(items, 'id-15', 5);
      expect(result.data).toHaveLength(5);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('Memory Management', () => {
    it('should return memory stats', () => {
      const stats = optimizer.getMemoryStats();
      expect(stats.heapUsedMB).toBeGreaterThan(0);
      expect(stats.heapTotalMB).toBeGreaterThan(0);
      expect(stats.rssMemoryMB).toBeGreaterThan(0);
      expect(['normal', 'warning', 'critical']).toContain(stats.status);
    });

    it('should check memory budget', () => {
      const result = optimizer.checkMemoryBudget();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Query Timeout', () => {
    it('should return default timeout', () => {
      const timeout = optimizer.getQueryTimeout();
      expect(timeout).toBe(30000);
    });

    it('should execute within timeout', async () => {
      const result = await optimizer.executeWithTimeout(async () => 'ok', 5000);
      expect(result).toBe('ok');
    });

    it('should throw on timeout', async () => {
      await expect(
        optimizer.executeWithTimeout(() => new Promise(r => setTimeout(r, 10000)), 50),
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('Batch Processing', () => {
    it('should process batches with progress', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i + 1);
      const progresses: any[] = [];
      const { results, progress } = await optimizer.processBatches(
        items,
        async (batch) => batch.map(x => x * 2),
        { batchSize: 10, maxConcurrent: 2, backpressureThreshold: 100, retryAttempts: 3, retryDelayMs: 100 },
        (p) => progresses.push({ ...p }),
      );
      expect(results).toHaveLength(50);
      expect(results[0]).toBe(2);
      expect(progress.percentComplete).toBe(100);
      expect(progress.processedRows).toBe(50);
      expect(progresses.length).toBe(5);
    });

    it('should retry on failure', async () => {
      let attempt = 0;
      const items = [1, 2, 3];
      const { results } = await optimizer.processBatches(
        items,
        async (batch) => {
          attempt++;
          if (attempt === 1) throw new Error('Transient');
          return batch;
        },
        { batchSize: 10, maxConcurrent: 1, backpressureThreshold: 100, retryAttempts: 3, retryDelayMs: 50 },
      );
      expect(results).toHaveLength(3);
    });
  });

  describe('Cache', () => {
    it('should set and get cached data', () => {
      optimizer.setCache('key1', { data: 'test' }, 60000);
      const result = optimizer.getCached<{ data: string }>('key1');
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for expired cache', () => {
      optimizer.setCache('key2', 'old', 1);
      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) { /* busy wait */ }
      const result = optimizer.getCached('key2');
      expect(result).toBeNull();
    });

    it('should invalidate cache by pattern', () => {
      optimizer.setCache('tenant:T1:query1', 'a', 60000);
      optimizer.setCache('tenant:T1:query2', 'b', 60000);
      optimizer.setCache('tenant:T2:query1', 'c', 60000);
      const count = optimizer.invalidateCache('T1');
      expect(count).toBe(2);
      expect(optimizer.getCached('tenant:T2:query1')).toBe('c');
    });
  });

  describe('Execution Measurement', () => {
    it('should measure sync execution', () => {
      const { result, durationMs } = optimizer.measureExecution('test', () => 42);
      expect(result).toBe(42);
      expect(durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should measure async execution', async () => {
      const { result, durationMs } = await optimizer.measureAsyncExecution('test', async () => 'done');
      expect(result).toBe('done');
      expect(durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
