// ═══════════════════════════════════════════════════════════════════════
// D7: Interaction Engine — Domain Entities
// Constitutional: Part 12, TXD-001. Cluster: DPC. Database: interaction_db
// FORBIDDEN: Access to business module databases (TXD-005)
// ═══════════════════════════════════════════════════════════════════════

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('interaction_layers')
@Index(['tenantId'])
export class InteractionLayer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() layerType: string;
  @Column({ type: 'jsonb' }) elements: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) animations: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) triggers: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('navigation_maps')
@Index(['tenantId'])
export class NavigationMap {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column({ default: 'linear' }) mapType: string;
  @Column({ type: 'jsonb' }) nodes: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) transitions: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('live_bindings')
@Index(['tenantId'])
export class LiveBinding {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column({ type: 'uuid' }) cdrDocumentId: string;
  @Column() elementId: string;
  @Column() dataSourceUrl: string;
  @Column({ default: 30000 }) refreshIntervalMs: number;
  @Column({ type: 'timestamp', nullable: true }) lastRefreshedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

