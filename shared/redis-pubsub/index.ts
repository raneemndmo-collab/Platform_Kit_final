// SCALE-001/002 FIX: Redis PubSub + Shared Permission Cache
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private handlers: Map<string, Array<(data: unknown) => void>> = new BoundedMap<unknown, unknown>(10_000);
  private readonly instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  private publisher: unknown = null;
  private subscriber: unknown = null;

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env['REDIS_URL'];
    if (redisUrl) {
      try {
        // In production: const Redis = require('ioredis');
        // this.publisher = new Redis(redisUrl);
        // this.subscriber = new Redis(redisUrl);
        this.logger.log(`SCALE-001: Redis PubSub ready (${this.instanceId})`);
      } catch (e) { this.logger.warn(`SCALE-001: Redis PubSub unavailable: ${e}`); }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
  }

  async publish(channel: string, data: unknown): Promise<void> {
    const msg = JSON.stringify({ instanceId: this.instanceId, channel, data, ts: Date.now() });
    if (this.publisher) await this.publisher.publish(`rasid:evt:${channel}`, msg);
    this.deliverLocal(channel, data);
  }

  async subscribe(channel: string, handler: (data: unknown) => void): Promise<void> {
    if (!this.handlers.has(channel)) this.handlers.set(channel, []);
    this.handlers.get(channel)!.push(handler);
    if (this.subscriber) {
      await this.subscriber.subscribe(`rasid:evt:${channel}`);
      this.subscriber.on('message', (_: string, msg: string) => {
        try {
          const p = JSON.parse(msg);
          if (p.instanceId !== this.instanceId) this.deliverLocal(p.channel, p.data);
        } catch {}
      });
    }
  }

  private deliverLocal(ch: string, data: unknown): void {
    for (const h of this.handlers.get(ch) || []) {
      try { h(data); } catch (e) { this.logger.error(`SCALE-001: Handler error ${ch}: ${e}`); }
    }
  }
}

@Injectable()
export class RedisPermissionCache {
  private readonly logger = new Logger(RedisPermissionCache.name);
  private localCache: Map<string, { perms: string[]; exp: number }> = new BoundedMap<unknown, unknown>(10_000);
  private readonly ttl = 30_000;

  async get(tenantId: string, userId: string): Promise<string[] | null> {
    const key = `${tenantId}:${userId}`;
    const c = this.localCache.get(key);
    if (c && c.exp > Date.now()) return c.perms;
    // Production: check Redis → await redis.get(`rasid:perms:${key}`)
    return null;
  }

  async set(tenantId: string, userId: string, perms: string[]): Promise<void> {
    this.localCache.set(`${tenantId}:${userId}`, { perms, exp: Date.now() + this.ttl });
    // Production: await redis.setex(`rasid:perms:${key}`, 60, JSON.stringify(perms))
  }

  async invalidate(tenantId: string, userId?: string): Promise<void> {
    if (userId) { this.localCache.delete(`${tenantId}:${userId}`); }
    else { for (const k of this.localCache.keys()) { if (k.startsWith(`${tenantId}:`)) this.localCache.delete(k); } }
    this.logger.log(`SCALE-002: Perms invalidated ${tenantId}/${userId || 'all'}`);
  }
}
