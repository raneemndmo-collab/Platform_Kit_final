// ═══════════════════════════════════════════════════════════════════════
// D2: Layout Graph Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: layout_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('layout_grids')
@Index(['tenantId'])
export class LayoutGrid {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() pageIndex: number;
  @Column() gridType: string;
  @Column() columns: number;
  @Column() rows: number;
  @Column({ default: 16 }) gutterPx: number;
  @Column({ type: 'jsonb' }) constraints: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) responsiveBreakpoints: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('layout_containers')
@Index(['tenantId'])
export class LayoutContainer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) gridId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() containerType: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) x: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) y: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) width: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) height: number;
  @Column({ default: 0 }) zOrder: number;
  @Column({ type: 'uuid', nullable: true }) parentContainerId: string;
  @Column({ default: 'ltr' }) flowDirection: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('constraint_sets')
@Index(['tenantId'])
export class ConstraintSet {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() constraintType: string;
  @Column() sourceElementId: string;
  @Column({ nullable: true }) targetElementId: string;
  @Column({ type: 'jsonb' }) rule: Record<string, unknown>;
  @Column({ default: 5 }) priority: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

