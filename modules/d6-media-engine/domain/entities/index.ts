// ═══════════════════════════════════════════════════════════════════════
// D6: Media Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC-GPU. Database: media_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('media_assets')
@Index(['tenantId'])
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() assetType: string;
  @Column() fileId: string;
  @Column() format: string;
  @Column({ nullable: true }) width: number;
  @Column({ nullable: true }) height: number;
  @Column({ nullable: true }) durationMs: number;
  @Column({ type: 'bigint' }) fileSize: number;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>;
  @Column({ nullable: true }) generatedBy: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('generation_jobs')
@Index(['tenantId'])
export class GenerationJob {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() jobType: string;
  @Column({ type: 'text', nullable: true }) prompt: string;
  @Column({ default: 'queued' }) status: string;
  @Column({ type: 'uuid', nullable: true }) assetId: string;
  @Column({ nullable: true }) modelUsed: string;
  @Column({ nullable: true }) durationMs: number;
  @Column({ type: 'text', nullable: true }) errorMessage: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('video_compositions')
@Index(['tenantId'])
export class VideoComposition {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column({ type: 'jsonb' }) tracks: Record<string, unknown>;
  @Column() durationMs: number;
  @Column({ default: '1920x1080' }) resolution: string;
  @Column({ default: 30 }) fps: number;
  @Column({ nullable: true }) outputFileId: string;
  @Column({ default: 'draft' }) status: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

