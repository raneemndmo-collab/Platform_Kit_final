import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('data_models') export class DataModel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() name: string;
  @Column({ type: 'jsonb' }) dimensions: Record<string, unknown>;
  @Column({ type: 'jsonb' }) measures: Record<string, unknown>;
  @Column({ type: 'jsonb' }) relationships: Record<string, unknown>;
  @Column({ nullable: true }) schemaType: string; // star | snowflake
  @Column({ type: 'jsonb', nullable: true }) primaryKeys: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) temporalHierarchy: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('metric_derivations') export class MetricDerivation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() modelId: string;
  @Column() kpiName: string;
  @Column() aggregation: string;
  @Column({ type: 'jsonb', nullable: true }) anomalyPattern: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) trendModel: Record<string, unknown>;
  @Column({ type: 'float', nullable: true }) confidence: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('predictions') export class Prediction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column() modelId: string;
  @Column() predictionType: string; // trend | scenario | whatif | montecarlo
  @Column({ type: 'jsonb' }) parameters: Record<string, unknown>;
  @Column({ type: 'jsonb' }) result: Record<string, unknown>;
  @Column({ type: 'float' }) confidenceScore: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('query_plans') export class QueryPlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() tenantId: string;
  @Column({ type: 'text' }) originalQuery: string;
  @Column({ type: 'text' }) optimizedQuery: string;
  @Column({ type: 'float' }) estimatedCost: number;
  @Column({ type: 'float' }) actualCost: number;
  @Column({ type: 'float' }) speedup: number;
  @CreateDateColumn() createdAt: Date;
}
