import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('nlp_tasks')
@Index(['tenantId', 'taskType'])
export class NLPTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() @Index() tenantId: string;
  @Column() taskType: string; // sentiment, entity_extraction, classification, translation, summarization
  @Column({ type: 'text' }) inputText: string;
  @Column({ type: 'jsonb', nullable: true }) result: Record<string, unknown>;
  @Column({ default: 'pending' }) status: string;
  @Column({ nullable: true }) modelId: string;
  @Column({ nullable: true }) language: string;
  @Column({ type: 'int', nullable: true }) latencyMs: number;
  @Column({ nullable: true }) requestSource: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('nlp_models')
@Index(['tenantId', 'taskType'])
export class NLPModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() taskType: string;
  @Column({ type: 'jsonb', nullable: true }) supportedLanguages: string[];
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) accuracy: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('nlp_training_data')
@Index(['tenantId', 'taskType'])
export class NLPTrainingData {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column() @Index() tenantId: string;
  @Column() taskType: string;
  @Column({ type: 'text' }) inputText: string;
  @Column({ type: 'jsonb' }) expectedOutput: Record<string, unknown>;
  @Column({ default: false }) isValidated: boolean;
  @CreateDateColumn() createdAt: Date;
}
