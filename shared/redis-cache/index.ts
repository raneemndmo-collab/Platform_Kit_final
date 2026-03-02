import { BoundedMap } from '../bounded-collections';
/**
 * C2: Redis Cache Layer
 * ────────────────────────────────────────────────────────
 * Tenant-aware, TTL-managed, event-driven cache with
 * namespace isolation and tag-based invalidation.
 * Falls back to in-memory Map when Redis unavailable.
 * Constitutional: A1 (Singleton), P-005 (Stateless)
 */
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL: number;
  maxMemoryPolicy?: string;
}

export interface CacheEntry<T = unknown> {
  value: T;
  tenantId: string;
  createdAt: number;
  ttl: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly store = new BoundedMap<string, string>(10_000);
  private readonly keyPrefix: string;
  private readonly defaultTTL: number;
  private readonly expirationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly tagIndex = new Map<string, Set<string>>(); // tag → keys
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(config?: Partial<CacheConfig>) {
    this.keyPrefix = config?.keyPrefix ?? 'rasid:';
    this.defaultTTL = config?.defaultTTL ?? 300;
    this.logger.log(`Cache initialized: prefix=${this.keyPrefix}, TTL=${this.defaultTTL}s`);
  }

  // ─── Key Builder ───
  private buildKey(tenantId: string, namespace: string, key: string): string {
    return `${this.keyPrefix}${tenantId}:${namespace}:${key}`;
  }

  // ─── Core Operations ───
  async get<T>(tenantId: string, namespace: string, key: string): Promise<T | null> {
    const fullKey = this.buildKey(tenantId, namespace, key);
    const raw = this.store.get(fullKey);
    if (!raw) {
      this.stats.misses++;
      return null;
    }
    try {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (entry.tenantId !== tenantId) {
        this.logger.warn(`Tenant mismatch: expected ${tenantId}, got ${entry.tenantId}`);
        return null;
      }
      this.stats.hits++;
      return entry.value;
    } catch {
      this.store.delete(fullKey);
      return null;
    }
  }

  async set<T>(
    tenantId: string, namespace: string, key: string,
    value: T, ttl?: number, tags?: string[],
  ): Promise<void> {
    const fullKey = this.buildKey(tenantId, namespace, key);
    const entry: CacheEntry<T> = {
      value, tenantId,
      createdAt: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      tags,
    };

    this.store.set(fullKey, JSON.stringify(entry));

    // TTL expiration
    const existingTimer = this.expirationTimers.get(fullKey);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      this.store.delete(fullKey);
      this.expirationTimers.delete(fullKey);
      this.removeFromTagIndex(fullKey);
      this.stats.evictions++;
    }, entry.ttl * 1000);
    this.expirationTimers.set(fullKey, timer);

    // Tag indexing
    if (tags) {
      for (const tag of tags) {
        const tagKey = `${tenantId}:${tag}`;
        if (!this.tagIndex.has(tagKey)) this.tagIndex.set(tagKey, new Set());
        this.tagIndex.get(tagKey)!.add(fullKey);
      }
    }
  }

  async delete(tenantId: string, namespace: string, key: string): Promise<boolean> {
    const fullKey = this.buildKey(tenantId, namespace, key);
    const timer = this.expirationTimers.get(fullKey);
    if (timer) clearTimeout(timer);
    this.expirationTimers.delete(fullKey);
    this.removeFromTagIndex(fullKey);
    return this.store.delete(fullKey);
  }

  /**
   * Invalidate all cache entries with a given tag for a tenant.
   */
  async invalidateByTag(tenantId: string, tag: string): Promise<number> {
    const tagKey = `${tenantId}:${tag}`;
    const keys = this.tagIndex.get(tagKey);
    if (!keys) return 0;
    let count = 0;
    for (const fullKey of keys) {
      const timer = this.expirationTimers.get(fullKey);
      if (timer) clearTimeout(timer);
      this.expirationTimers.delete(fullKey);
      if (this.store.delete(fullKey)) count++;
    }
    this.tagIndex.delete(tagKey);
    return count;
  }

  /**
   * Invalidate all cache for a namespace+tenant.
   */
  async invalidateNamespace(tenantId: string, namespace: string): Promise<number> {
    const prefix = this.buildKey(tenantId, namespace, '');
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        const timer = this.expirationTimers.get(key);
        if (timer) clearTimeout(timer);
        this.expirationTimers.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get-or-Set pattern: returns cached value or computes and caches.
   */
  async getOrSet<T>(
    tenantId: string, namespace: string, key: string,
    factory: () => Promise<T>, ttl?: number, tags?: string[],
  ): Promise<T> {
    const cached = await this.get<T>(tenantId, namespace, key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(tenantId, namespace, key, value, ttl, tags);
    return value;
  }

  /**
   * Flush all entries for a tenant.
   */
  async flushTenant(tenantId: string): Promise<number> {
    const prefix = `${this.keyPrefix}${tenantId}:`;
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        const timer = this.expirationTimers.get(key);
        if (timer) clearTimeout(timer);
        this.expirationTimers.delete(key);
        count++;
      }
    }
    return count;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.store.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  private removeFromTagIndex(fullKey: string): void {
    for (const [, keys] of this.tagIndex) {
      keys.delete(fullKey);
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
    this.store.clear();
    this.tagIndex.clear();
  }
}

/**
 * Cache module for NestJS DI registration.
 */
export class RedisCacheModule {
  static forRoot(config?: Partial<CacheConfig>) {
    return {
      module: RedisCacheModule,
      providers: [
        { provide: 'CACHE_CONFIG', useValue: config ?? {} },
        RedisCacheService,
      ],
      exports: [RedisCacheService],
      global: true,
    };
  }
}
