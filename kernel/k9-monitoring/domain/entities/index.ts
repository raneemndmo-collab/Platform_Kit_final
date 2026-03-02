// =============================================================================
// K9: Monitoring — Domain Entities
// Constitutional Reference: K9 Contract, 15-second health interval
// Database: monitoring_db (exclusive)
// =============================================================================

import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, Index, BeforeInsert,
} from 'typeorm';

// ─── Health Record ────────────────────────────────────────────────
@Entity('health_records')
@Index(['tenantId', 'moduleId', 'recordedAt'])
export class HealthRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column({ type: 'enum', enum: ['healthy', 'degraded', 'unhealthy', 'unknown'], default: 'unknown' })
  status: string;

  @Column({ type: 'float', nullable: true })
  responseTimeMs: number;

  @Column({ type: 'float', nullable: true })
  cpuUsagePercent: number;

  @Column({ type: 'float', nullable: true })
  memoryUsageMb: number;

  @Column({ type: 'int', nullable: true })
  activeConnections: number;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @Column()
  recordedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Metric Snapshot ──────────────────────────────────────────────
@Entity('metric_snapshots')
@Index(['tenantId', 'moduleId', 'metricName', 'recordedAt'])
export class MetricSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column()
  metricName: string;

  @Column({ type: 'enum', enum: ['gauge', 'counter', 'histogram'] })
  metricType: string;

  @Column({ type: 'float' })
  value: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'jsonb', nullable: true })
  labels: Record<string, string>;

  @Column()
  recordedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Alert Rule ───────────────────────────────────────────────────
@Entity('alert_rules')
@Index(['tenantId', 'moduleId'])
export class AlertRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  moduleId: string;

  @Column()
  metricName: string;

  @Column({ type: 'enum', enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq'] })
  operator: string;

  @Column({ type: 'float' })
  threshold: number;

  @Column({ default: 60 })
  evaluationWindowSeconds: number;

  @Column({ default: 3 })
  consecutiveBreaches: number;

  @Column({ type: 'enum', enum: ['critical', 'warning', 'info'], default: 'warning' })
  severity: string;

  @Column({ type: 'jsonb', nullable: true })
  notificationChannels: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Alert Incident ───────────────────────────────────────────────
@Entity('alert_incidents')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'ruleId'])
export class AlertIncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  ruleId: string;

  @Column()
  ruleName: string;

  @Column()
  moduleId: string;

  @Column({ type: 'enum', enum: ['open', 'acknowledged', 'resolved'], default: 'open' })
  status: string;

  @Column()
  severity: string;

  @Column({ type: 'float' })
  triggeredValue: number;

  @Column({ type: 'float' })
  thresholdValue: number;

  @Column({ nullable: true })
  acknowledgedBy: string;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolutionNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}
