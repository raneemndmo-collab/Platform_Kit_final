import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('ai_execution_plans') export class AiExecutionPlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() inputType: string; // image | file | data | mixed
  @Column({ type: 'jsonb' }) plan: Record<string, unknown>;
  @Column() selectedMode: string; // STRICT | PROFESSIONAL | HYBRID
  @Column({ default: false }) gpuRequired: boolean;
  @Column({ type: 'jsonb', nullable: true }) resourceEstimate: Record<string, unknown>;
  @Column({ default: 'pending' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) result: Record<string, unknown>;
  @Column({ default: 0 }) retryCount: number;
  @Column({ nullable: true }) latencyMs: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('agent_tasks') export class AgentTask {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() planId: string;
  @Column() agentType: string; // layout | data | spreadsheet | bi | arabic | design | verification | performance
  @Column({ type: 'jsonb' }) input: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) output: Record<string, unknown>;
  @Column({ default: 'pending' }) status: string;
  @Column({ nullable: true }) latencyMs: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('agent_results') export class AgentResult {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() taskId: string;
  @Column() agentType: string;
  @Column({ type: 'float', default: 0 }) qualityScore: number;
  @Column({ type: 'jsonb' }) output: Record<string, unknown>;
  @Column({ default: false }) passedVerification: boolean;
  @CreateDateColumn() createdAt: Date;
}
