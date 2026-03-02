// =============================================================================
// K8: Data Governance — Domain Entities
// Constitutional Reference: K8 Contract
// Database: governance_db (exclusive)
// =============================================================================

import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, Index, BeforeInsert,
} from 'typeorm';

// ─── Data Classification ──────────────────────────────────────────
@Entity('data_classifications')
@Index(['tenantId', 'moduleId', 'fieldPath'], { unique: true })
export class DataClassificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column()
  entityName: string;

  @Column()
  fieldPath: string;

  @Column({ type: 'enum', enum: ['public', 'internal', 'confidential', 'restricted'] })
  classification: string;

  @Column({ default: false })
  isPII: boolean;

  @Column({ default: false })
  isFinancial: boolean;

  @Column({ default: false })
  isHealthData: boolean;

  @Column({ nullable: true })
  encryptionRequired: boolean;

  @Column({ nullable: true })
  maskingPattern: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  classifiedBy: string;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Retention Policy ─────────────────────────────────────────────
@Entity('retention_policies')
@Index(['tenantId', 'moduleId', 'entityName'], { unique: true })
export class RetentionPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column()
  entityName: string;

  @Column()
  retentionDays: number;

  @Column({ type: 'enum', enum: ['delete', 'archive', 'anonymize'], default: 'archive' })
  archiveStrategy: string;

  @Column({ nullable: true })
  archiveLocation: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastEnforcedAt: Date;

  @Column({ default: 0 })
  recordsProcessed: number;

  @Column({ type: 'jsonb', nullable: true })
  legalHold: { enabled: boolean; reason?: string; until?: string };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}

// ─── Schema Validation ────────────────────────────────────────────
@Entity('schema_validations')
@Index(['tenantId', 'moduleId', 'schemaName'])
export class SchemaValidationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  moduleId: string;

  @Column()
  schemaName: string;

  @Column()
  version: number;

  @Column({ type: 'jsonb' })
  jsonSchema: Record<string, unknown>;

  @Column({ default: true })
  isBackwardCompatible: boolean;

  @Column({ nullable: true })
  previousVersion: number;

  @Column({ type: 'jsonb', nullable: true })
  breakingChanges: string[];

  @Column({ nullable: true })
  validatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  validateTenant() {
    if (!this.tenantId) throw new Error('FP-011: tenantId required');
  }
}
