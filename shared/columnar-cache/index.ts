// Rasid v6.4 — Columnar Hot Cache Layer — Part IX
import { BoundedMap } from '../bounded-collections';
import { Injectable } from '@nestjs/common';

interface CacheEntry { column: string; data: unknown[]; rowOrder: number[]; lastAccess: number; accessCount: number; tenantId: string; }

@Injectable()
export class ColumnarHotCache {
  private cache = new BoundedMap<string, CacheEntry>(10_000);
  private readonly MAX_ENTRIES = 1000;
  private readonly TTL_MS = 300_000; // 5 min

  set(tenantId: string, table: string, column: string, data: unknown[], rowOrder: number[]): void {
    if (this.cache.size >= this.MAX_ENTRIES) this.evict();
    const key = `${tenantId}:${table}:${column}`;
    this.cache.set(key, { column, data, rowOrder, lastAccess: Date.now(), accessCount: 1, tenantId });
  }

  get(tenantId: string, table: string, column: string): unknown[] | null {
    const key = `${tenantId}:${table}:${column}`;
    const entry = this.cache.get(key);
    if (!entry || entry.tenantId !== tenantId) return null;
    if (Date.now() - entry.lastAccess > this.TTL_MS) { this.cache.delete(key); return null; }
    entry.lastAccess = Date.now(); entry.accessCount++;
    return entry.data;
  }

  invalidate(tenantId: string, table?: string): void {
    for (const [k, v] of this.cache) { if (v.tenantId === tenantId && (!table || k.includes(`:${table}:`))) this.cache.delete(k); }
  }

  private evict(): void {
    let oldest: string | null = null, oldestTime = Infinity;
    for (const [k, v] of this.cache) { if (v.lastAccess < oldestTime) { oldest = k; oldestTime = v.lastAccess; } }
    if (oldest) this.cache.delete(oldest);
  }

  stats(): { entries: number; tenants: number } {
    return { entries: this.cache.size, tenants: new Set([...this.cache.values()].map(v => v.tenantId)).size };
  }
}

// Extended: TTL, LRU eviction, tenant boundaries
export interface CacheStats {
  hits: number; misses: number; evictions: number;
  memoryUsedMb: number; entryCount: number; hitRate: number;
}

export class ColumnarHotCacheExtended {
  private cache = new BoundedMap<string, { data: unknown[]; accessTime: number; tenantId: string; ttl: number }>(10_000);
  private maxEntries = 1000;
  private maxMemoryMb = 512;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, memoryUsedMb: 0, entryCount: 0, hitRate: 0 };

  get(key: string, tenantId: string): unknown[] | null {
    const entry = this.cache.get(key);
    if (!entry || entry.tenantId !== tenantId) { this.stats.misses++; this.updateHitRate(); return null; }
    if (Date.now() > entry.ttl) { this.cache.delete(key); this.stats.misses++; this.updateHitRate(); return null; }
    entry.accessTime = Date.now();
    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  set(key: string, tenantId: string, data: unknown[], ttlMs: number = 300000): void {
    if (this.cache.size >= this.maxEntries) this.evictLRU();
    this.cache.set(key, { data, accessTime: Date.now(), tenantId, ttl: Date.now() + ttlMs });
    this.stats.entryCount = this.cache.size;
  }

  invalidateTenant(tenantId: string): number {
    let count = 0;
    for (const [k, v] of this.cache) { if (v.tenantId === tenantId) { this.cache.delete(k); count++; } }
    this.stats.entryCount = this.cache.size;
    return count;
  }

  getStats(): CacheStats { return { ...this.stats }; }

  private evictLRU(): void {
    let oldest = Infinity, oldestKey = '';
    for (const [k, v] of this.cache) { if (v.accessTime < oldest) { oldest = v.accessTime; oldestKey = k; } }
    if (oldestKey) { this.cache.delete(oldestKey); this.stats.evictions++; }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

// GAP-16: Deterministic row ordering guarantee
  getWithDeterministicOrder(tenantId: string, column: string, orderKey: string = '_rowIndex'): { data: unknown[]; ordered: boolean } {
    const entry = this.cache.get(this.buildKey(tenantId, column));
    if (!entry || entry.expiry < Date.now()) return { data: [], ordered: false };
    const sorted = [...entry.data].sort((a, b) => {
      const va = a[orderKey] ?? 0, vb = b[orderKey] ?? 0;
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
    return { data: sorted, ordered: true };
  }

  private buildKey(tenantId: string, column: string): string {
    return `${tenantId}:${column}`;
  }
}
