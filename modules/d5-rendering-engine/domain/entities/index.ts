// ═══════════════════════════════════════════════════════════════════════
// D5: Rendering Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: render_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('render_jobs')
@Index(['tenantId'])
export class RenderJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() targetFormat: string;
  @Column({ default: 'queued' }) status: string;
  @Column({ default: 5 }) priority: number;
  @Column({ nullable: true }) outputFileId: string;
  @Column({ nullable: true }) rendererId: string;
  @Column({ nullable: true }) durationMs: number;
  @Column({ default: true }) deterministic: boolean;
  @Column({ nullable: true }) layoutFingerprint: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('output_artifacts')
@Index(['tenantId'])
export class OutputArtifact {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) renderJobId: string;
  @Column() format: string;
  @Column() fileId: string;
  @Column({ type: 'bigint' }) fileSize: number;
  @Column() contentHash: string;
  @Column({ nullable: true }) pageCount: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('format_renderers')
@Index(['tenantId'])
export class FormatRenderer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() format: string;
  @Column() rendererVersion: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb' }) capabilities: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) config: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('render_cache')
@Index(['tenantId'])
export class RenderCache {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() @Index() contentHash: string;
  @Column() targetFormat: string;
  @Column({ type: 'uuid' }) artifactId: string;
  @Column({ default: 0 }) hitCount: number;
  @Column({ type: 'timestamp', nullable: true }) lastAccessedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) expiresAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

