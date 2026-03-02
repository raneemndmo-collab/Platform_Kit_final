/**
 * C2: Redis Cache Service Tests
 */
import { RedisCacheService } from '../shared/redis-cache';

describe('RedisCacheService', () => {
  let cache: RedisCacheService;

  beforeEach(() => {
    cache = new RedisCacheService({ defaultTTL: 60 });
  });

  afterEach(() => {
    cache.onModuleDestroy();
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await cache.set('tenant-1', 'users', 'user-1', { name: 'أحمد' });
      const result = await cache.get('tenant-1', 'users', 'user-1');
      expect(result).toEqual({ name: 'أحمد' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('t1', 'ns', 'missing');
      expect(result).toBeNull();
    });

    it('should isolate tenants', async () => {
      await cache.set('tenant-1', 'ns', 'key', 'value1');
      await cache.set('tenant-2', 'ns', 'key', 'value2');
      expect(await cache.get('tenant-1', 'ns', 'key')).toBe('value1');
      expect(await cache.get('tenant-2', 'ns', 'key')).toBe('value2');
    });

    it('should enforce tenant mismatch protection', async () => {
      await cache.set('tenant-1', 'ns', 'key', 'secret');
      // Direct access with wrong tenant should fail
      const result = await cache.get('tenant-2', 'ns', 'key');
      expect(result).toBeNull(); // Different key prefix
    });
  });

  describe('delete', () => {
    it('should delete entries', async () => {
      await cache.set('t1', 'ns', 'k1', 'v1');
      const deleted = await cache.delete('t1', 'ns', 'k1');
      expect(deleted).toBe(true);
      expect(await cache.get('t1', 'ns', 'k1')).toBeNull();
    });
  });

  describe('tag invalidation', () => {
    it('should invalidate by tag', async () => {
      await cache.set('t1', 'ns', 'k1', 'v1', 60, ['reports']);
      await cache.set('t1', 'ns', 'k2', 'v2', 60, ['reports']);
      await cache.set('t1', 'ns', 'k3', 'v3', 60, ['users']);
      const count = await cache.invalidateByTag('t1', 'reports');
      expect(count).toBe(2);
      expect(await cache.get('t1', 'ns', 'k1')).toBeNull();
      expect(await cache.get('t1', 'ns', 'k3')).toEqual('v3');
    });
  });

  describe('namespace invalidation', () => {
    it('should flush entire namespace', async () => {
      await cache.set('t1', 'users', 'k1', 'v1');
      await cache.set('t1', 'users', 'k2', 'v2');
      await cache.set('t1', 'reports', 'k1', 'v1');
      const count = await cache.invalidateNamespace('t1', 'users');
      expect(count).toBe(2);
      expect(await cache.get('t1', 'reports', 'k1')).toEqual('v1');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value without calling factory', async () => {
      await cache.set('t1', 'ns', 'k', 'cached');
      let factoryCalled = false;
      const result = await cache.getOrSet('t1', 'ns', 'k', async () => {
        factoryCalled = true;
        return 'new';
      });
      expect(result).toBe('cached');
      expect(factoryCalled).toBe(false);
    });

    it('should call factory on cache miss', async () => {
      const result = await cache.getOrSet('t1', 'ns', 'k', async () => 'computed');
      expect(result).toBe('computed');
      expect(await cache.get('t1', 'ns', 'k')).toBe('computed');
    });
  });

  describe('stats', () => {
    it('should track hits and misses', async () => {
      await cache.set('t1', 'ns', 'k', 'v');
      await cache.get('t1', 'ns', 'k');  // hit
      await cache.get('t1', 'ns', 'missing'); // miss
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('flushTenant', () => {
    it('should flush all tenant data', async () => {
      await cache.set('t1', 'ns1', 'k1', 'v');
      await cache.set('t1', 'ns2', 'k2', 'v');
      await cache.set('t2', 'ns1', 'k1', 'v');
      const count = await cache.flushTenant('t1');
      expect(count).toBe(2);
      expect(await cache.get('t2', 'ns1', 'k1')).toEqual('v');
    });
  });
});
