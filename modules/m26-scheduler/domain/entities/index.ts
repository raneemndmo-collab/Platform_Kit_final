// M26: Scheduler - Domain Entities
// Database: scheduler_db | Event Namespace: scheduler.*
// Purpose: Distributed job scheduling, cron jobs, recurring tasks, queue management

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('scheduled_jobs')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'nextRunAt'])
export class ScheduledJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  jobType: string; // cron, interval, one_time, event_triggered

  @Column({ nullable: true })
  cronExpression: string;

  @Column({ type: 'int', nullable: true })
  intervalSeconds: number;

  @Column()
  targetModule: string; // Module ID to invoke

  @Column()
  targetAction: string; // Action/endpoint to call

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ default: 'active' })
  status: string; // active, paused, completed, failed, disabled

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ nullable: true })
  lastRunStatus: string;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ default: 'medium' })
  priority: string; // low, medium, high, critical

  @Column({ type: 'int', default: 300 })
  timeoutSeconds: number;

  @Column({ nullable: true })
  lockId: string; // Distributed lock for execution

  @Column({ type: 'timestamp', nullable: true })
  lockExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('job_executions')
@Index(['tenantId', 'jobId'])
@Index(['tenantId', 'status'])
export class JobExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  jobId: string;

  @Column()
  executionNumber: number;

  @Column({ default: 'running' })
  status: string; // running, completed, failed, timed_out, cancelled

  @Column({ nullable: true })
  workerId: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown>;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  errorStack: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('job_queues')
@Index(['tenantId', 'queueName'])
export class JobQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  queueName: string;

  @Column({ type: 'int', default: 10 })
  concurrency: number;

  @Column({ default: 'active' })
  status: string; // active, paused, draining

  @Column({ type: 'int', default: 0 })
  pendingCount: number;

  @Column({ type: 'int', default: 0 })
  processingCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
