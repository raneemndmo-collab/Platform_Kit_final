// M8: Workflow Engine - Domain Entities
// Database: workflow_db | Event Namespace: workflow.*
// Purpose: Configurable approval workflows, multi-step chains, condition evaluation

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('workflow_definitions')
@Index(['tenantId', 'moduleScope'])
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  moduleScope: string; // hrm, finance, procurement, document, etc.

  @Column()
  triggerEvent: string; // Event that starts this workflow

  @Column({ type: 'jsonb' })
  steps: WorkflowStepDef[]; // Ordered list of steps

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface WorkflowStepDef {
  stepId: string;
  name: string;
  type: 'approval' | 'condition' | 'action' | 'notification' | 'parallel';
  config: Record<string, unknown>;
  onApprove?: string; // next stepId
  onReject?: string;  // next stepId or 'end'
  timeoutHours?: number;
}

@Entity('workflow_instances')
@Index(['tenantId', 'definitionId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'entityId'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  definitionId: string;

  @Column()
  entityType: string; // purchase_order, document, leave_request, etc.

  @Column()
  entityId: string;

  @Column({ default: 'active' })
  status: string; // active, completed, cancelled, failed, timed_out

  @Column()
  currentStepId: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, unknown>; // Workflow variables

  @Column({ nullable: true })
  initiatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('workflow_step_executions')
@Index(['tenantId', 'instanceId'])
export class WorkflowStepExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  instanceId: string;

  @Column()
  stepId: string;

  @Column()
  stepName: string;

  @Column()
  stepType: string;

  @Column({ default: 'pending' })
  status: string; // pending, in_progress, approved, rejected, skipped, timed_out

  @Column({ nullable: true })
  assigneeId: string;

  @Column({ nullable: true })
  decidedBy: string;

  @Column({ nullable: true })
  decision: string;

  @Column({ nullable: true })
  comments: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  timeoutAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('workflow_audit_trail')
@Index(['tenantId', 'instanceId'])
export class WorkflowAuditTrail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  instanceId: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  stepId: string;

  @Column({ nullable: true })
  actorId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @CreateDateColumn()
  timestamp: Date;
}
