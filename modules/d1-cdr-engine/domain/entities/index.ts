// ═══════════════════════════════════════════════════════════════════════
// D1: CDR Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: cdr_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('cdr_documents')
@Index(['tenantId'])
export class CDRDocument {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() sourceFormat: string;
  @Column() @Index() contentHash: string;
  @Column({ default: 'draft' }) status: string;
  @Column({ type: 'decimal', precision: 3, scale: 2 }) fidelityScore: number;
  @Column() pageCount: number;
  @Column({ type: 'bigint' }) fileSize: number;
  @Column() sourceFileId: string;
  @Column({ default: 1 }) cdrVersion: number;
  @Column({ type: 'jsonb', nullable: true }) layoutTree: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) semanticGraph: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) visualConstraints: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) bindingMap: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) interactionMap: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) brandMeta: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) languageMeta: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('cdr_versions')
@Index(['tenantId'])
export class CDRVersion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() versionNumber: number;
  @Column() changeType: string;
  @Column({ type: 'jsonb' }) layersModified: Record<string, unknown>;
  @Column() contentHash: string;
  @Column() createdBy: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('parse_jobs')
@Index(['tenantId'])
export class ParseJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() sourceFormat: string;
  @Column() sourceFileId: string;
  @Column({ default: 'queued' }) status: string;
  @Column({ default: 5 }) priority: number;
  @Column({ type: 'uuid', nullable: true }) cdrDocumentId: string;
  @Column({ type: 'text', nullable: true }) errorMessage: string;
  @Column({ nullable: true }) durationMs: number;
  @Column({ nullable: true }) parserId: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('format_parsers')
@Index(['tenantId'])
export class FormatParser {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() format: string;
  @Column() parserVersion: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb' }) supportedExtensions: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) config: Record<string, unknown>;
  @Column({ default: 100 }) maxFileSizeMb: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

