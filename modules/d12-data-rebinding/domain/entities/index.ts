// ═══════════════════════════════════════════════════════════════════════
// D12: Data Rebinding Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: rebinding_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('binding_templates')
@Index(['tenantId'])
export class BindingTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column({ type: 'jsonb' }) slots: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) conditionalRules: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) aggregationRules: Record<string, unknown>;
  @Column({ default: 'active' }) status: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('data_source_mappings')
@Index(['tenantId'])
export class DataSourceMapping {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) templateId: string;
  @Column() slotName: string;
  @Column() sourceType: string;
  @Column() sourceEndpoint: string;
  @Column({ type: 'jsonb' }) schemaMap: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) transformRules: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('refresh_policies')
@Index(['tenantId'])
export class RefreshPolicy {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) templateId: string;
  @Column() refreshType: string;
  @Column({ nullable: true }) intervalMs: number;
  @Column({ type: 'jsonb', nullable: true }) triggerEvents: Record<string, unknown>;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

