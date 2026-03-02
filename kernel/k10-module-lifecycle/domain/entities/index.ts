// =============================================================================
// K10: Module Lifecycle — Domain Entities
// Constitutional Reference: K10 Contract, DGV-002
// Database: lifecycle_db (exclusive)
// =============================================================================

import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, Index, BeforeInsert,
} from 'typeorm';

// ─── Module Registry ──────────────────────────────────────────────
@Entity('module_registry')
@Index(['tenantId', 'moduleId'], { unique: true })
export class ModuleRegistryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['kernel', 'business', 'document', 'presentation'] })
  tier: string;

  @Column()
  version: string;

  @Column({ type: 'enum', enum: ['registered', 'active', 'degraded', 'frozen', 'deprecated'], default: 'registered' })
  status: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  ownerTeam: string;

  @Column()
  databaseName: string;

  @Column()
  apiBasePath: string;

  @Column({ type: 'jsonb', default: '[]' })
  eventNamespaces: string[];

  @Column({ type: 'jsonb', default: '[]' })
  exposedPermissions: string[];

  @Column({ type: 'jsonb', default: '{}' })
  manifest: Record<string, unknown>;

  @Column({ default: false })
  isFrozen: boolean;

  @Column({ nullable: true })
  frozenAt: Date;

  @Column({ nullable: true })
  frozenBy: string;

  @Column({ type: 'int', nullable: true })
  phase: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Dependency Edge ──────────────────────────────────────────────
@Entity('dependency_edges')
@Index(['tenantId', 'sourceModule', 'targetModule'], { unique: true })
export class DependencyEdgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  sourceModule: string;

  @Column()
  targetModule: string;

  @Column({ type: 'enum', enum: ['required', 'optional', 'event'], default: 'required' })
  dependencyType: string;

  @Column({ nullable: true })
  contractVersion: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Module Version ───────────────────────────────────────────────
@Entity('module_versions')
@Index(['tenantId', 'moduleId', 'version'], { unique: true })
export class ModuleVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column()
  version: string;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ type: 'jsonb', nullable: true })
  breakingChanges: string[];

  @Column({ nullable: true })
  releasedBy: string;

  @Column({ nullable: true })
  releasedAt: Date;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}
