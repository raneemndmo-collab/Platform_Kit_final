import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('analytics_events')
@Index(['tenantId', 'eventType'])
@Index(['tenantId', 'timestamp'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() eventType: string;
  @Column() sourceModule: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ nullable: true }) userId: string;
  @Column({ nullable: true }) sessionId: string;
  @Column({ type: 'timestamp' }) timestamp: Date;
  @CreateDateColumn() createdAt: Date;
}

@Entity('analytics_dashboards')
@Index(['tenantId'])
export class AnalyticsDashboard {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column({ type: 'jsonb' }) widgets: Record<string, unknown>[];
  @Column({ nullable: true }) ownerId: string;
  @Column({ default: false }) isDefault: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('analytics_metrics')
@Index(['tenantId', 'metricName'])
export class AnalyticsMetric {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() metricName: string;
  @Column() aggregationType: string; // count, sum, avg, min, max, percentile
  @Column({ type: 'jsonb' }) dimensions: Record<string, unknown>;
  @Column({ type: 'decimal', precision: 20, scale: 4 }) value: number;
  @Column({ type: 'timestamp' }) periodStart: Date;
  @Column({ type: 'timestamp' }) periodEnd: Date;
  @Column() granularity: string; // minute, hour, day, week, month
  @CreateDateColumn() createdAt: Date;
}

@Entity('data_lake_entries')
@Index(['tenantId', 'tier'])
@Index(['tenantId', 'sourceModule'])
export class DataLakeEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() tier: string; // hot, warm, cold
  @Column() sourceModule: string;
  @Column() dataType: string;
  @Column({ type: 'jsonb' }) data: Record<string, unknown>;
  @Column({ type: 'bigint', nullable: true }) sizeBytes: number;
  @Column({ type: 'timestamp', nullable: true }) promotedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) archivedAt: Date;
  @CreateDateColumn() createdAt: Date;
}
