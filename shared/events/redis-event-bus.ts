// Rasid v6.4 — Redis Event Bus — SCALE-002/C3 Fix
// Multi-instance event delivery via Redis pub/sub
import { Injectable, Logger } from '@nestjs/common';

export interface EventMessage {
  id: string;
  type: string;
  tenantId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  source: string;
}

type EventHandler = (event: EventMessage) => Promise<void>;

/**
 * SCALE-002: Redis-backed event bus for multi-instance
 * Falls back to in-process EventEmitter when Redis unavailable
 */
@Injectable()
export class RedisEventBus {
  private readonly logger = new Logger(RedisEventBus.name);
  private handlers = new Map<string, EventHandler[]>();
  private redisPublisher: unknown = null;
  private redisSubscriber: unknown = null;
  private isRedisAvailable = false;
  private instanceId: string;

  constructor() {
    this.instanceId = `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) return;

    try {
      const Redis = require('ioredis');
      this.redisPublisher = new Redis(redisUrl);
      this.redisSubscriber = new Redis(redisUrl);
      this.isRedisAvailable = true;

      this.redisSubscriber.on('message', (channel: string, message: string) => {
        try {
          const event: EventMessage = JSON.parse(message);
          this.deliverLocal(channel, event);
        } catch (e) {
          this.logger.error(`Failed to parse event: ${e}`);
        }
      });

      this.logger.log('Redis event bus connected');
    } catch (e) {
      this.logger.warn(`Redis event bus not available: ${e}`);
    }
  }

  async publish(event: EventMessage): Promise<void> {
    const channel = `rasid:events:${event.type}`;

    if (this.isRedisAvailable) {
      try {
        await this.redisPublisher.publish(channel, JSON.stringify({
          ...event, _source: this.instanceId,
        }));
        return;
      } catch (e) {
        this.logger.error(`Redis publish failed: ${e}`);
      }
    }

    // Fallback: local delivery only
    await this.deliverLocal(channel, event);
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const channel = `rasid:events:${eventType}`;
    
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
    }
    this.handlers.get(channel)!.push(handler);

    if (this.isRedisAvailable) {
      this.redisSubscriber.subscribe(channel).catch((e: Error) =>
        this.logger.error(`Failed to subscribe to ${channel}: ${e}`)
      );
    }
  }

  private async deliverLocal(channel: string, event: EventMessage): Promise<void> {
    const handlers = this.handlers.get(channel) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (e) {
        this.logger.error(`Event handler failed for ${event.type}: ${e}`);
      }
    }
  }
}
