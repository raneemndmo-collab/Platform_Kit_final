// =============================================================================
// B4, AI-001, PERF-001 FIX: Bounded Collections
// Prevent unbounded growth of in-memory Maps and Arrays
// All 43 Maps + 21 Arrays in shared libs MUST use these
// =============================================================================

/**
 * LRU-evicting Map with configurable max size.
 * Replaces all unbounded `new Map()` in shared libs.
 */
export class BoundedMap<K, V> extends Map<K, V> {
  constructor(private readonly maxSize: number = 10_000) {
    super();
  }

  set(key: K, value: V): this {
    // If key already exists, delete first to update insertion order
    if (this.has(key)) this.delete(key);

    // Evict oldest entries if at capacity
    while (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) this.delete(firstKey);
      else break;
    }

    return super.set(key, value);
  }

  /** Get with LRU touch — moves entry to end (most recent) */
  getAndTouch(key: K): V | undefined {
    const value = this.get(key);
    if (value !== undefined) {
      this.delete(key);
      super.set(key, value);
    }
    return value;
  }
}

/**
 * Bounded Array that auto-trims when exceeding max length.
 * Replaces all unbounded history/metrics arrays.
 */
export class BoundedArray<T> {
  private items: T[] = [];
  constructor(
    private readonly maxLength: number = 1_000,
    private readonly trimTo: number = Math.floor(1_000 * 0.5),
  ) {
    this.trimTo = Math.min(trimTo, maxLength);
  }

  push(...values: T[]): number {
    this.items.push(...values);
    if (this.items.length > this.maxLength) {
      this.items = this.items.slice(-this.trimTo);
    }
    return this.items.length;
  }

  get length(): number { return this.items.length; }
  get data(): readonly T[] { return this.items; }
  slice(start?: number, end?: number): T[] { return this.items.slice(start, end); }
  reduce<U>(fn: (acc: U, val: T, idx: number) => U, initial: U): U { return this.items.reduce(fn, initial); }
  map<U>(fn: (val: T, idx: number) => U): U[] { return this.items.map(fn); }
  filter(fn: (val: T, idx: number) => boolean): T[] { return this.items.filter(fn); }
  some(fn: (val: T) => boolean): boolean { return this.items.some(fn); } // A6 fix: use .some() not .filter().length
  every(fn: (val: T) => boolean): boolean { return this.items.every(fn); }
  find(fn: (val: T) => boolean): T | undefined { return this.items.find(fn); }
  sort(fn?: (a: T, b: T) => number): T[] { return this.items.sort(fn); }
  clear(): void { this.items = []; }
  [Symbol.iterator](): Iterator<T> { return this.items[Symbol.iterator](); }
  toArray(): T[] { return [...this.items]; }
}

/**
 * TTL-aware bounded cache with LRU eviction.
 * Replacement for permission cache and similar patterns.
 */
export class TTLCache<K, V> {
  private readonly cache = new Map<K, { value: V; expiresAt: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly maxSize: number = 10_000,
    private readonly defaultTTLMs: number = 300_000, // 5 min
    cleanupIntervalMs: number = 60_000, // cleanup every 1 min
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  set(key: K, value: V, ttlMs?: number): void {
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
      else break;
    }
    this.cache.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTTLMs) });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return undefined; }
    return entry.value;
  }

  delete(key: K): boolean { return this.cache.delete(key); }
  has(key: K): boolean { const v = this.get(key); return v !== undefined; }
  get size(): number { return this.cache.size; }

  clear(): void { this.cache.clear(); }
  destroy(): void {
    if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.cache) {
      if (now > v.expiresAt) this.cache.delete(k);
    }
  }
}
