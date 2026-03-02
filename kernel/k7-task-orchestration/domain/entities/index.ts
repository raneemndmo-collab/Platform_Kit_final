// =============================================================================
// K7: Task Orchestration — Domain Entities
// Constitutional Reference: K7 Contract
// Database: orchestration_db (exclusive)
// =============================================================================

import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, Index, VersionColumn, BeforeInsert,
} from 'typeorm';

// ─── Saga Instance ────────────────────────────────────────────────
@Entity('saga_instances')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'sagaType'])
export class SagaInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  sagaType: string;

  @Column()
  initiatorModule: string;

  @Column({ type: 'enum', enum: ['pending', 'running', 'completed', 'compensating', 'failed', 'aborted'], default: 'pending' })
  status: string;

  @Column({ default: 0 })
  currentStep: number;

  @Column({ type: 'jsonb', default: '{}' })
  context: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '[]' })
  stepResults: Array<{ step: number; status: string; result?: unknown; error?: string }>;

  @Column({ nullable: true })
  correlationId: string;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @VersionColumn()
  version: number;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Saga Step Definition ─────────────────────────────────────────
@Entity('saga_step_definitions')
@Index(['tenantId', 'sagaType', 'stepOrder'], { unique: true })
export class SagaStepDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  sagaType: string;

  @Column()
  stepOrder: number;

  @Column()
  name: string;

  @Column()
  targetModule: string;

  @Column()
  actionEndpoint: string;

  @Column({ nullable: true })
  compensationEndpoint: string;

  @Column({ default: 30000 })
  timeoutMs: number;

  @Column({ default: 3 })
  maxRetries: number;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Scheduled Job ────────────────────────────────────────────────
@Entity('scheduled_jobs')
@Index(['tenantId', 'status'])
export class ScheduledJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  moduleId: string;

  @Column()
  cronExpression: string;

  @Column()
  handlerEndpoint: string;

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: ['active', 'paused', 'disabled'], default: 'active' })
  status: string;

  @Column({ nullable: true })
  lastRunAt: Date;

  @Column({ nullable: true })
  nextRunAt: Date;

  @Column({ nullable: true })
  lastRunStatus: string;

  @Column({ default: 0 })
  consecutiveFailures: number;

  @Column({ default: 5 })
  maxConsecutiveFailures: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Task Execution ───────────────────────────────────────────────
@Entity('task_executions')
@Index(['tenantId', 'jobId'])
@Index(['tenantId', 'status'])
export class TaskExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column({ nullable: true })
  jobId: string;

  @Column({ nullable: true })
  sagaId: string;

  @Column()
  taskType: string;

  @Column()
  targetModule: string;

  @Column({ type: 'enum', enum: ['pending', 'running', 'completed', 'failed', 'timeout'], default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', default: '{}' })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown>;

  @Column({ nullable: true })
  error: string;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column()
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}
