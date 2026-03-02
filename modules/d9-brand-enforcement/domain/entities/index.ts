// ═══════════════════════════════════════════════════════════════════════
// D9: Brand Enforcement Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: brand_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('brand_packs')
@Index(['tenantId'])
export class BrandPack {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() version: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb' }) colorPalette: Record<string, unknown>;
  @Column({ type: 'jsonb' }) typographyRules: Record<string, unknown>;
  @Column({ type: 'jsonb' }) logoAssets: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) spacingRules: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) toneGuidelines: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('compliance_reports')
@Index(['tenantId'])
export class ComplianceReport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column({ type: 'uuid' }) brandPackId: string;
  @Column({ type: 'decimal', precision: 3, scale: 2 }) score: number;
  @Column({ type: 'jsonb' }) violations: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) suggestions: Record<string, unknown>;
  @Column({ default: 'pending' }) status: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

