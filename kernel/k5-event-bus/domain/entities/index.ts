// =============================================================================
// K5: Event Bus — Domain Entities
// Constitutional Reference: P-006 (Event-Driven), EVT-001-006, FP-010
// Database: eventbus_db (exclusive)
// Event Namespace: event.* (meta-events about the bus itself)
// =============================================================================

import { Entity, Column, Index, Unique } from 'typeorm';
import { RasidBaseEntity, AuditBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('event_schemas')
@Unique(['namespace', 'eventType', 'version'])
export class EventSchemaEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 128 })
  @Index('idx_schema_namespace')
  namespace!: string;

  @Column({ type: 'varchar', length: 256 })
  eventType!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 32 })
  ownerModule!: string;

  @Column({ type: 'jsonb' })
  jsonSchema!: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // EVT-002: Event schemas are append-only. Removal is FORBIDDEN.
  @Column({ type: 'boolean', default: false })
  isDeprecated!: boolean;
}

@Entity('event_subscriptions')
@Unique(['tenantId', 'subscriberModule', 'eventType'])
export class EventSubscriptionEntity extends RasidBaseEntity {
  @Column({ type: 'varchar', length: 32 })
  subscriberModule!: string;

  @Column({ type: 'varchar', length: 256 })
  eventType!: string;

  @Column({ type: 'varchar', length: 128 })
  namespace!: string;

  @Column({ type: 'varchar', length: 256 })
  handlerEndpoint!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  @Column({ type: 'varchar', length: 16, default: 'P1' })
  priority!: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
}

@Entity('dead_letter_events')
@Index('idx_dle_module', ['publisherModule'])
@Index('idx_dle_created', ['createdAt'])
export class DeadLetterEventEntity extends AuditBaseEntity {
  @Column({ type: 'varchar', length: 256 })
  eventType!: string;

  @Column({ type: 'varchar', length: 128 })
  namespace!: string;

  @Column({ type: 'varchar', length: 32 })
  publisherModule!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'text' })
  failureReason!: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'retried' | 'resolved' | 'abandoned';

  @Column({ type: 'varchar', length: 64 })
  correlationId!: string;
}

@Entity('event_log')
@Index('idx_eventlog_type', ['eventType'])
@Index('idx_eventlog_time', ['timestamp'])
export class EventLogEntity extends AuditBaseEntity {
  @Column({ type: 'varchar', length: 256 })
  eventType!: string;

  @Column({ type: 'varchar', length: 128 })
  namespace!: string;

  @Column({ type: 'varchar', length: 32 })
  publisherModule!: string;

  @Column({ type: 'varchar', length: 64 })
  correlationId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  causationId?: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'int' })
  schemaVersion!: number;
}
