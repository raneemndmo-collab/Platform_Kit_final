// =============================================================================
// Rasid Platform v6 — Shared Event Client
// Constitutional Reference: CRS-003, CRS-005
// Shared libraries limited to: auth-client, event-client, api-client, common DTOs
// No business logic in shared libraries (CRS-004, FP-022)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, EventMetadata } from '../interfaces';

/**
 * EventClient: Standard interface for publishing and subscribing to domain events.
 * All modules MUST use this client for event communication.
 * Direct Kafka/RabbitMQ access is FORBIDDEN (P-007).
 */
@Injectable()
export class EventClient {
  private readonly logger = new Logger(EventClient.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Publish a domain event.
   * ESR-001: Event type must be registered in K5 Schema Registry.
   * ESR-003: Publisher must own the event namespace.
   */
  async publish<T>(params: {
    eventType: string;
    namespace: string;
    publisherModule: string;
    tenantId: string;
    payload: T;
    correlationId?: string;
    causationId?: string;
  }): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      eventId: uuidv4(),
      eventType: params.eventType,
      namespace: params.namespace,
      version: 1,
      timestamp: new Date(),
      tenantId: params.tenantId,
      correlationId: params.correlationId || uuidv4(),
      causationId: params.causationId,
      publisherModule: params.publisherModule,
      payload: params.payload,
      metadata: {
        schemaVersion: 1,
        contentType: 'application/json',
        idempotencyKey: uuidv4(),
        traceId: uuidv4(),
        spanId: uuidv4(),
      },
    };

    this.eventEmitter.emit(params.eventType, event);
    this.logger.debug(`Published: ${params.eventType} [${params.publisherModule}]`);
    return event;
  }

  /**
   * Subscribe to a domain event type.
   * EVT-006: Consumers MUST be idempotent (FP-009).
   */
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    this.eventEmitter.on(eventType, async (event: DomainEvent) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`Event handler failed for ${eventType}: ${error}`);
        // DLQ handling delegated to K5
      }
    });
    this.logger.debug(`Subscribed to: ${eventType}`);
  }
}
