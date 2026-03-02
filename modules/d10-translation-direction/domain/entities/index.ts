// ═══════════════════════════════════════════════════════════════════════
// D10: Translation & Direction Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC-GPU. Database: translation_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('translation_jobs')
@Index(['tenantId'])
export class TranslationJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() sourceLanguage: string;
  @Column() targetLanguage: string;
  @Column({ default: 'queued' }) status: string;
  @Column({ nullable: true }) translationProvider: string;
  @Column({ nullable: true }) wordCount: number;
  @Column({ nullable: true }) durationMs: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('direction_profiles')
@Index(['tenantId'])
export class DirectionProfile {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() sourceDirection: string;
  @Column() targetDirection: string;
  @Column({ type: 'jsonb' }) mirrorRules: Record<string, unknown>;
  @Column({ type: 'jsonb' }) axisInversion: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) tableReflowRules: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) chartTransformRules: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('cultural_rules')
@Index(['tenantId'])
export class CulturalRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() locale: string;
  @Column() ruleType: string;
  @Column({ type: 'jsonb' }) rule: Record<string, unknown>;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ default: 5 }) priority: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

