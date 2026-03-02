// M11: AI Orchestration - Domain Entities
// Database: ai_orchestration_db | Event Namespace: ai.*
// Purpose: AI model registry, inference routing, containment, fallback chains, model hot-swap

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('ai_models')
@Index(['tenantId', 'capability'])
@Index(['tenantId', 'status'])
export class AIModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  provider: string; // openai, anthropic, local, huggingface

  @Column()
  modelIdentifier: string; // gpt-4, claude-3, llama-3

  @Column()
  capability: string; // text-generation, classification, embedding, vision, speech

  @Column()
  version: string;

  @Column({ default: 'active' })
  status: string; // active, inactive, deprecated, warming_up

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown>; // endpoint, apiKey ref, parameters

  @Column({ type: 'int', default: 0 })
  priority: number; // Lower = higher priority in fallback chain

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  costPerToken: number;

  @Column({ type: 'int', nullable: true })
  maxTokens: number;

  @Column({ type: 'int', nullable: true })
  rateLimitPerMinute: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('ai_inference_requests')
@Index(['tenantId', 'modelId'])
@Index(['tenantId', 'status'])
export class AIInferenceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  modelId: string;

  @Column()
  capability: string;

  @Column()
  requestSource: string; // Module that requested

  @Column({ default: 'pending' })
  status: string; // pending, processing, completed, failed, fallback

  @Column({ type: 'jsonb' })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  inputTokens: number;

  @Column({ type: 'int', nullable: true })
  outputTokens: number;

  @Column({ type: 'int', nullable: true })
  latencyMs: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  fallbackLevel: number; // L0=primary, L1-L4=fallback

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('ai_containment_rules')
@Index(['tenantId'])
export class AIContainmentRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  ruleName: string;

  @Column()
  ruleType: string; // data_access, output_filter, rate_limit, cost_cap

  @Column({ type: 'jsonb' })
  conditions: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  actions: Record<string, unknown>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('ai_fallback_chains')
@Index(['tenantId', 'capability'])
export class AIFallbackChain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  capability: string;

  @Column({ type: 'jsonb' })
  chain: { level: number; modelId: string; timeoutMs: number; conditions?: Record<string, unknown> }[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('ai_capability_interfaces')
@Index(['tenantId'])
export class AICapabilityInterface {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  capabilityName: string; // text-generation, classification, embedding, vision, speech, translation, summarization

  @Column({ type: 'jsonb' })
  inputSchema: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  outputSchema: Record<string, unknown>;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
