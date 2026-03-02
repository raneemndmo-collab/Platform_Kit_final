// Rasid v6.4 — Parallel Execution Utilities — A8 Fix
import { Logger } from '@nestjs/common';

const logger = new Logger('ParallelExecution');

/**
 * A8 FIX: Execute multiple independent operations in parallel
 * instead of sequential await chains
 */
export async function parallelAll<T>(
  tasks: Array<() => Promise<T>>,
  options: { concurrency?: number; label?: string } = {},
): Promise<T[]> {
  const { concurrency = 10, label = 'parallel' } = options;
  const results: T[] = [];
  
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
    logger.debug(`[${label}] Batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(tasks.length / concurrency)} completed`);
  }
  return results;
}

export async function parallelSettled<T>(
  tasks: Array<() => Promise<T>>,
  options: { concurrency?: number } = {},
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }>> {
  const { concurrency = 10 } = options;
  const results: Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }> = [];
  
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    results.push(...batchResults.map(r => 
      r.status === 'fulfilled' 
        ? { status: 'fulfilled' as const, value: r.value }
        : { status: 'rejected' as const, reason: r.reason }
    ));
  }
  return results;
}

// Race with timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback?: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        if (fallback !== undefined) return _(fallback as any);
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    ),
  ]);
}

// Retry with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 100, maxDelayMs = 5000 } = options;
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError!;
}
