// ═══════════════════════════════════════════════════════════════════════
// D8: Typography Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: typography_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('font_families')
@Index(['tenantId'])
export class FontFamily {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() category: string;
  @Column({ type: 'jsonb' }) scripts: Record<string, unknown>;
  @Column({ type: 'jsonb' }) weights: Record<string, unknown>;
  @Column({ type: 'jsonb' }) fileIds: Record<string, unknown>;
  @Column({ default: false }) isSystem: boolean;
  @Column({ nullable: true }) license: string;
  @Column({ type: 'uuid', nullable: true }) fallbackFamilyId: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('shaping_rules')
@Index(['tenantId'])
export class ShapingRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() script: string;
  @Column({ nullable: true }) language: string;
  @Column() ruleType: string;
  @Column({ type: 'jsonb', nullable: true }) ligatures: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) kerningPairs: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) config: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('fallback_ladders')
@Index(['tenantId'])
export class FallbackLadder {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() script: string;
  @Column({ type: 'jsonb' }) sequence: Record<string, unknown>;
  @Column({ default: false }) isDefault: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

