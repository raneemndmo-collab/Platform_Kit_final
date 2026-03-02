// ═══════════════════════════════════════════════════════════════════════
// D11: Design Constraint Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: constraint_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('constraint_rules')
@Index(['tenantId'])
export class ConstraintRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() ruleType: string;
  @Column() category: string;
  @Column({ type: 'jsonb' }) rule: Record<string, unknown>;
  @Column({ default: 5 }) priority: number;
  @Column({ default: false }) isDefault: boolean;
  @Column({ type: 'text', nullable: true }) description: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('density_maps')
@Index(['tenantId'])
export class DensityMap {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() pageIndex: number;
  @Column({ type: 'decimal', precision: 5, scale: 2 }) density: number;
  @Column({ type: 'jsonb' }) zones: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) recommendations: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('emphasis_maps')
@Index(['tenantId'])
export class EmphasisMap {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column({ type: 'jsonb' }) elementScores: Record<string, unknown>;
  @Column({ type: 'jsonb' }) hierarchyProfile: Record<string, unknown>;
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true }) harmonyScore: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

