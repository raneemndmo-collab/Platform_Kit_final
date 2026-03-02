import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('decision_rules')
@Index(['tenantId', 'ruleSet'])
export class DecisionRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() ruleSet: string;
  @Column({ type: 'jsonb' }) conditions: Record<string, unknown>;
  @Column({ type: 'jsonb' }) actions: Record<string, unknown>;
  @Column({ type: 'int', default: 0 }) priority: number;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) description: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('decision_executions')
@Index(['tenantId', 'ruleSetExecuted'])
export class DecisionExecution {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() ruleSetExecuted: string;
  @Column({ type: 'jsonb' }) inputData: Record<string, unknown>;
  @Column({ type: 'jsonb' }) matchedRules: string[];
  @Column({ type: 'jsonb' }) outputActions: Record<string, unknown>;
  @Column({ type: 'int', nullable: true }) latencyMs: number;
  @Column() requestSource: string;
  @CreateDateColumn() executedAt: Date;
}

@Entity('decision_models')
@Index(['tenantId', 'modelType'])
export class DecisionModel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() modelType: string; // rule_based, ml_classification, scoring, recommendation
  @Column({ type: 'jsonb', nullable: true }) config: Record<string, unknown>;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) accuracy: number;
  @CreateDateColumn() createdAt: Date;
}
