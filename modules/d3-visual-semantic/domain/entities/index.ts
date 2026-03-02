// ═══════════════════════════════════════════════════════════════════════
// D3: Visual Semantic Model — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC-GPU. Database: vsm_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('semantic_nodes')
@Index(['tenantId'])
export class SemanticNode {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() nodeType: string;
  @Column({ nullable: true }) label: string;
  @Column() hierarchyLevel: number;
  @Column({ type: 'decimal', precision: 3, scale: 2 }) emphasisScore: number;
  @Column({ type: 'decimal', precision: 3, scale: 2 }) confidence: number;
  @Column({ type: 'uuid', nullable: true }) parentNodeId: string;
  @Column({ type: 'jsonb', nullable: true }) properties: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hierarchy_trees')
@Index(['tenantId'])
export class HierarchyTree {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column({ type: 'uuid' }) rootNodeId: string;
  @Column() depth: number;
  @Column() totalNodes: number;
  @Column({ type: 'jsonb', nullable: true }) designIntent: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('classification_models')
@Index(['tenantId'])
export class ClassificationModel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() modelName: string;
  @Column() modelVersion: string;
  @Column() taskType: string;
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true }) accuracy: number;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) config: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

