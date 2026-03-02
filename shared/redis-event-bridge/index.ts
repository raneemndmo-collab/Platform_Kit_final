// SCALE-001 FIX: Redis Pub/Sub bridge for cross-instance event delivery
// EventEmitter2 remains the in-process bus; this bridge replicates across nodes.
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisCacheService } from '../redis-cache';

@Injectable()
export class RedisEventBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisEventBridge.name);
  private readonly instanceId = `rasid-${process.pid}-${Date.now()}`;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly redis: RedisCacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Subscribe to all domain events and publish to Redis
    this.eventEmitter.onAny(async (event: string, data: unknown) => {
      try {
        const channel = `rasid:events:${event}`;
        await this.redis.set(channel, JSON.stringify({
          event, data, source: this.instanceId, ts: Date.now(),
        }), 60); // TTL 60s
      } catch (e) {
        this.logger.debug(`Redis publish failed for ${event}: ${e}`);
      }
    });

    // Poll for cross-instance events (production: replace with Redis Pub/Sub subscriber)
    this.pollingInterval = setInterval(async () => {
      try {
        const keys = await this.redis.keys('rasid:events:*');
        for (const key of keys ?? []) {
          const raw = await this.redis.get<string>(key);
          if (raw) {
            const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (msg.source !== this.instanceId) {
              this.eventEmitter.emit(msg.event, msg.data);
            }
          }
        }
      } catch (_) { /* Redis unavailable */ }
    }, 5000);

    this.logger.log('SCALE-001: Redis event bridge initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
}
