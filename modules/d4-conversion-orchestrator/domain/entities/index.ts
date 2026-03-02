// ═══════════════════════════════════════════════════════════════════════
// D4: Conversion Orchestrator — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: conversion_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('conversion_jobs')
@Index(['tenantId'])
export class ConversionJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() sourceFormat: string;
  @Column() targetFormat: string;
  @Column({ default: 'queued' }) status: string;
  @Column({ default: 5 }) priority: number;
  @Column({ type: 'uuid', nullable: true }) cdrDocumentId: string;
  @Column({ type: 'uuid', nullable: true }) pipelineId: string;
  @Column({ default: 0 }) currentStep: number;
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true }) fidelityScore: number;
  @Column({ nullable: true }) outputFileId: string;
  @Column({ type: 'text', nullable: true }) errorMessage: string;
  @Column({ nullable: true }) durationMs: number;
  @Column() requestedBy: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('pipelines')
@Index(['tenantId'])
export class Pipeline {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() sourceFormat: string;
  @Column() targetFormat: string;
  @Column({ type: 'jsonb' }) steps: Record<string, unknown>;
  @Column({ default: false }) isDefault: boolean;
  @Column({ nullable: true }) avgDurationMs: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('fidelity_checkpoints')
@Index(['tenantId'])
export class FidelityCheckpoint {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) jobId: string;
  @Column() stepIndex: number;
  @Column() moduleName: string;
  @Column({ type: 'decimal', precision: 3, scale: 2 }) fidelityScore: number;
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

