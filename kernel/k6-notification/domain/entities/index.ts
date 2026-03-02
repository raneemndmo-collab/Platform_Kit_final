// =============================================================================
// K6: Notification — Domain Entities
// Constitutional Reference: K6 Contract
// Database: notification_db (exclusive)
// =============================================================================

import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, Index, VersionColumn, BeforeInsert,
} from 'typeorm';

// ─── Notification Template ────────────────────────────────────────
@Entity('notification_templates')
@Index(['tenantId', 'name', 'channel'], { unique: true })
export class NotificationTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  moduleId: string;

  @Column({ type: 'enum', enum: ['email', 'sms', 'push', 'in_app', 'webhook'] })
  channel: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  bodyTemplate: string;

  @Column({ type: 'jsonb', default: '[]' })
  variables: string[];

  @Column({ default: 'ar' })
  locale: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @VersionColumn()
  version: number;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Notification Delivery ────────────────────────────────────────
@Entity('notification_deliveries')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'recipientId'])
export class NotificationDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  templateId: string;

  @Column()
  recipientId: string;

  @Column()
  channel: string;

  @Column({ type: 'jsonb', default: '{}' })
  variables: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  renderedSubject: string;

  @Column({ type: 'text', nullable: true })
  renderedBody: string;

  @Column({ type: 'enum', enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'], default: 'pending' })
  status: string;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  correlationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Notification Preference ──────────────────────────────────────
@Entity('notification_preferences')
@Index(['tenantId', 'userId', 'channel'], { unique: true })
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  userId: string;

  @Column()
  channel: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  mutedTemplates: string[];

  @Column({ nullable: true })
  quietHoursStart: string; // HH:mm

  @Column({ nullable: true })
  quietHoursEnd: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}
