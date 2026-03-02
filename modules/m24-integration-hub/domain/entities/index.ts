import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('integration_adapters')
@Index(['tenantId', 'adapterType'])
export class IntegrationAdapter {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() adapterType: string;
  @Column() protocol: string;
  @Column({ type: 'jsonb' }) connectionConfig: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) authConfig: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) fieldMappings: Record<string, unknown>;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'timestamp', nullable: true }) lastSyncAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('integration_flows')
@Index(['tenantId', 'adapterId'])
export class IntegrationFlow {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() adapterId: string;
  @Column() name: string;
  @Column() direction: string;
  @Column() triggerType: string;
  @Column({ type: 'jsonb' }) transformRules: Record<string, unknown>[];
  @Column({ nullable: true }) cronSchedule: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('integration_logs')
@Index(['tenantId', 'adapterId', 'status'])
export class IntegrationLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() adapterId: string;
  @Column({ nullable: true }) flowId: string;
  @Column() direction: string;
  @Column() status: string;
  @Column({ type: 'int', nullable: true }) recordsProcessed: number;
  @Column({ type: 'int', nullable: true }) recordsFailed: number;
  @Column({ nullable: true }) errorMessage: string;
  @Column({ type: 'int', nullable: true }) executionTimeMs: number;
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, unknown>;
  @CreateDateColumn() executedAt: Date;
}

@Entity('webhook_endpoints')
@Index(['tenantId'])
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() url: string;
  @Column({ type: 'jsonb', nullable: true }) headers: Record<string, string>;
  @Column({ type: 'jsonb' }) events: string[];
  @Column({ nullable: true }) secret: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: 'int', default: 0 }) failureCount: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
