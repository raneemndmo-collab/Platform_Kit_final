import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('dashboards')
@Index(['tenantId', 'ownerId'])
export class Dashboard {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column() ownerId: string;
  @Column({ default: false }) isDefault: boolean;
  @Column({ default: 'private' }) visibility: string;
  @Column({ type: 'jsonb', nullable: true }) layout: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) filters: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('dashboard_widgets')
@Index(['tenantId', 'dashboardId'])
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() dashboardId: string;
  @Column() widgetType: string;
  @Column() title: string;
  @Column({ type: 'jsonb' }) config: Record<string, unknown>;
  @Column({ type: 'jsonb' }) position: { x: number; y: number; w: number; h: number };
  @Column({ nullable: true }) dataSourceModule: string;
  @Column({ type: 'int', default: 30 }) refreshIntervalSec: number;
  @Column({ default: true }) isVisible: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('realtime_subscriptions')
@Index(['tenantId', 'userId'])
export class RealtimeSubscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() userId: string;
  @Column() channel: string;
  @Column({ default: 'websocket' }) transport: string;
  @Column({ type: 'jsonb', nullable: true }) filters: Record<string, unknown>;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() subscribedAt: Date;
}
