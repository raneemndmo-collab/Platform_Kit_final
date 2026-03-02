// ═══════════════════════════════════════════════════════════════════════
// D13: Visual Drift Detection Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: vdrift_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('fidelity_reports')
@Index(['tenantId'])
export class FidelityReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column({ type: 'uuid' }) renderJobId: string;
  @Column({ type: 'decimal', precision: 3, scale: 2 }) overallScore: number;
  @Column({ type: 'jsonb' }) layerScores: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, unknown>;
  @Column({ default: 'completed' }) status: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('pixel_diffs')
@Index(['tenantId'])
export class PixelDiff {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) sourceRenderJobId: string;
  @Column({ type: 'uuid' }) targetRenderJobId: string;
  @Column({ type: 'decimal', precision: 5, scale: 2 }) diffPercentage: number;
  @Column({ type: 'jsonb' }) diffRegions: Record<string, unknown>;
  @Column({ nullable: true }) diffImageFileId: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('regression_baselines')
@Index(['tenantId'])
export class RegressionBaseline {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() format: string;
  @Column() layoutFingerprint: string;
  @Column({ type: 'uuid' }) baselineRenderJobId: string;
  @Column({ type: 'jsonb' }) thresholds: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('drift_alerts')
@Index(['tenantId'])
export class DriftAlert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) reportId: string;
  @Column() severity: string;
  @Column() driftType: string;
  @Column({ type: 'text' }) message: string;
  @Column({ default: false }) acknowledged: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

