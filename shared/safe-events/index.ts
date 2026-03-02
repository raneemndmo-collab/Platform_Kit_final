import { BoundedMap } from '../bounded-collections';
/**
 * A5: Async Method Cleanup — Proper async event handling
 * A7: Sort Memoization — Cached sorting with TTL
 * B3: Safe Event Emission — Error-isolated event emitter
 * ────────────────────────────────────────────────────────
 * Constitutional: ARC-002, B3
 */
import { Logger } from '@nestjs/common';

// ═══════════════════════════════════════════════════════
// A7: Sort Memoization
// ═══════════════════════════════════════════════════════

export class MemoizedSorter<T> {
  private cache = new BoundedMap<string, { result: T[]; timestamp: number }>(10_000);
  private readonly maxCacheSize: number;
  private readonly ttl: number; // ms

  constructor(maxCacheSize = 100, ttlMs = 60_000) {
    this.maxCacheSize = maxCacheSize;
    this.ttl = ttlMs;
  }

  sort(items: T[], key: string, compareFn: (a: T, b: T) => number): T[] {
    const cacheKey = `${key}:${items.length}:${this.hashItems(items)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.ttl) {
      return cached.result;
    }

    const sorted = [...items].sort(compareFn);

    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entry
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, { result: sorted, timestamp: Date.now() });
    return sorted;
  }

  private hashItems(items: T[]): string {
    if (items.length === 0) return '0';
    const sample = [items[0], items[Math.floor(items.length / 2)], items[items.length - 1]];
    return Buffer.from(JSON.stringify(sample)).toString('base64').slice(0, 16);
  }

  invalidate(key?: string): void {
    if (key) {
      for (const k of this.cache.keys()) {
        if (k.startsWith(`${key}:`)) this.cache.delete(k);
      }
    } else {
      this.cache.clear();
    }
  }

  get size(): number { return this.cache.size; }
}

// Pre-configured sorters
export const prioritySorter = new MemoizedSorter<{ priority: number }>();
export const scoreSorter = new MemoizedSorter<{ score: number }>();
export const timestampSorter = new MemoizedSorter<{ timestamp: number }>();

// ═══════════════════════════════════════════════════════
// B3: Safe Event Emission
// ═══════════════════════════════════════════════════════

const eventLogger = new Logger('SafeEventEmitter');

export class SafeEventEmitter {
  private handlers = new Map<string, Array<(data: unknown) => Promise<void>>>();
  private errorCount = 0;
  private emitCount = 0;

  on(event: string, handler: (data: unknown) => Promise<void>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler?: (data: unknown) => Promise<void>): void {
    if (!handler) {
      this.handlers.delete(event);
      return;
    }
    const handlers = this.handlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
  }

  /**
   * Emit event safely — errors in individual handlers don't
   * affect other handlers or the emitting code.
   */
  async emit(event: string, data: unknown): Promise<{ success: number; failed: number }> {
    this.emitCount++;
    const handlers = this.handlers.get(event) ?? [];

    // Also match wildcard handlers
    for (const [pattern, h] of this.handlers) {
      if (pattern.endsWith('.*') && event.startsWith(pattern.slice(0, -2))) {
        handlers.push(...h);
      }
    }

    if (handlers.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      handlers.map(handler => handler(data)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        this.errorCount++;
        eventLogger.error(`Event handler error [${event}]: ${result.reason?.message ?? result.reason}`);
      }
    }

    return { success, failed };
  }

  /**
   * Emit with timeout — handlers that don't resolve within timeout are cancelled.
   */
  async emitWithTimeout(event: string, data: unknown, timeoutMs = 5000): Promise<{ success: number; failed: number; timedOut: number }> {
    this.emitCount++;
    const handlers = this.handlers.get(event) ?? [];
    if (handlers.length === 0) return { success: 0, failed: 0, timedOut: 0 };

    let success = 0;
    let failed = 0;
    let timedOut = 0;

    const results = await Promise.allSettled(
      handlers.map(handler =>
        Promise.race([
          handler(data),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Handler timeout')), timeoutMs)),
        ]),
      ),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success++;
      } else if (result.reason?.message === 'Handler timeout') {
        timedOut++;
      } else {
        failed++;
        this.errorCount++;
      }
    }

    return { success, failed, timedOut };
  }

  getStats(): { totalEmits: number; totalErrors: number; handlerCount: number } {
    let handlerCount = 0;
    for (const handlers of this.handlers.values()) handlerCount += handlers.length;
    return { totalEmits: this.emitCount, totalErrors: this.errorCount, handlerCount };
  }

// ═══════════════════════════════════════════════════════
// A5: Async Utility — Proper cleanup for fire-and-forget
// ═══════════════════════════════════════════════════════

/**
 * Safely execute async operations that shouldn't block the caller.
 * Catches and logs errors without propagating.
 */
export function fireAndForget(
  fn: () => Promise<void>,
  context = 'unknown',
): void {
  fn().catch(error => {
    eventLogger.error(`Fire-and-forget error [${context}]: ${error?.message ?? error}`);
  });
}

/**
 * Debounce async function — prevents rapid successive calls.
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delayMs: number,
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastPromise: Promise<unknown> = Promise.resolve();

  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    return new Promise((resolve, reject) => {
      timer = setTimeout(async () => {
        try {
          lastPromise = fn(...args);
          resolve(await lastPromise);
        } catch (e) {
          reject(e);
        }
      }, delayMs);
    });
  }) as T;
}
}
