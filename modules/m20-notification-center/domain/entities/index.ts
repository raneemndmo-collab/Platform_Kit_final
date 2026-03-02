import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notifications')
@Index(['tenantId', 'userId', 'isRead'])
@Index(['tenantId', 'channel'])
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) body: string;
  @Column() channel: string;
  @Column() category: string;
  @Column({ default: 'normal' }) priority: string;
  @Column({ nullable: true }) sourceModule: string;
  @Column({ nullable: true }) sourceEntityId: string;
  @Column({ nullable: true }) actionUrl: string;
  @Column({ default: false }) isRead: boolean;
  @Column({ default: 'pending' }) deliveryStatus: string;
  @Column({ type: 'timestamp', nullable: true }) readAt: Date;
  @Column({ type: 'timestamp', nullable: true }) deliveredAt: Date;
  @CreateDateColumn() createdAt: Date;
}

@Entity('notification_preferences')
@Index(['tenantId', 'userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column() category: string;
  @Column({ type: 'jsonb' }) channels: { email: boolean; push: boolean; inApp: boolean; sms: boolean };
  @Column({ default: true }) isEnabled: boolean;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('notification_templates')
@Index(['tenantId', 'eventType'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() eventType: string;
  @Column() channel: string;
  @Column() subject: string;
  @Column({ type: 'text' }) bodyTemplate: string;
  @Column({ type: 'jsonb', nullable: true }) variables: string[];
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}
