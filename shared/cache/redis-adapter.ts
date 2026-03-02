// Rasid v6.4 — Redis Cache Adapter — SCALE-001/C2 Fix
// Multi-instance cache with Redis backend
import { Injectable, Logger } from '@nestjs/common';

export interface CacheOptions {
  ttlMs?: number;
  tenantScoped?: boolean;
}

/**
 * SCALE-001: Redis-backed cache adapter
 * Replaces in-memory Maps for multi-instance deployments
 * Falls back to in-memory when Redis unavailable
 */
@Injectable()
export class RedisCacheAdapter {
  private readonly logger = new Logger(RedisCacheAdapter.name);
  private readonly fallbackCache = new Map<string, { value: unknown; expiry: number }>();
  private redisClient: unknown = null;
  private isRedisAvailable = false;

  constructor() {
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — using in-memory fallback cache');
      return;
    }

    try {
      // Dynamic import for optional Redis dependency
      const Redis = require('ioredis');
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });
      await this.redisClient.connect();
      this.isRedisAvailable = true;
      this.logger.log('Redis cache connected');
    } catch (error) {
      this.logger.warn(`Redis connection failed, using fallback: ${error}`);
    }
  }

  private tenantKey(tenantId: string, key: string): string {
    return `rasid:${tenantId}:${key}`;
  }

  async get<T>(tenantId: string, key: string): Promise<T | null> {
    const fullKey = this.tenantKey(tenantId, key);
    
    if (this.isRedisAvailable) {
      try {
        const raw = await this.redisClient.get(fullKey);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        this.logger.error(`Redis GET failed: ${e}`);
      }
    }

    // Fallback
    const entry = this.fallbackCache.get(fullKey);
    if (!entry) return null;
    if (Date.now() > entry.expiry) { this.fallbackCache.delete(fullKey); return null; }
    return entry.value as T;
  }

  async set<T>(tenantId: string, key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.tenantKey(tenantId, key);
    const ttlMs = options?.ttlMs || 300000; // 5 min default

    if (this.isRedisAvailable) {
      try {
        await this.redisClient.set(fullKey, JSON.stringify(value), 'PX', ttlMs);
        return;
      } catch (e) {
        this.logger.error(`Redis SET failed: ${e}`);
      }
    }

    // Fallback
    this.fallbackCache.set(fullKey, { value, expiry: Date.now() + ttlMs });
    if (this.fallbackCache.size > 50000) {
      // Evict oldest 25%
      const entries = [...this.fallbackCache.entries()].sort((a, b) => a[1].expiry - b[1].expiry);
      entries.slice(0, entries.length * 0.25).forEach(([k]) => this.fallbackCache.delete(k));
    }
  }

  async invalidate(tenantId: string, pattern?: string): Promise<number> {
    const prefix = `rasid:${tenantId}:${pattern || ''}`;
    
    if (this.isRedisAvailable) {
      try {
        const keys = await this.redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
        return keys.length;
      } catch (e) {
        this.logger.error(`Redis invalidate failed: ${e}`);
      }
    }

    let count = 0;
    for (const k of this.fallbackCache.keys()) {
      if (k.startsWith(prefix)) { this.fallbackCache.delete(k); count++; }
    }
    return count;
  }

  async getStats(): Promise<{ backend: string; entries: number; memoryMb: number }> {
    if (this.isRedisAvailable) {
      try {
        const info = await this.redisClient.info('memory');
        const memMatch = info.match(/used_memory:(\d+)/);
        const keysInfo = await this.redisClient.dbsize();
        return { backend: 'redis', entries: keysInfo, memoryMb: memMatch ? parseInt(memMatch[1]) / 1024 / 1024 : 0 };
      } catch (e) { /* fallback */ }
    }
    return { backend: 'memory', entries: this.fallbackCache.size, memoryMb: 0 };
  }
}
