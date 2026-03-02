// =============================================================================
// Rasid Platform v6 — Base Entity with Tenant Isolation
// Constitutional Reference: P-016 (Tenant Isolation), FP-011, FP-024
// Row-Level Security on tenantId for ALL entities.
// =============================================================================

import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export abstract class RasidBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, nullable: false })
  @Index('idx_tenant_id')
  tenantId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'varchar', length: 64, nullable: false })
  createdBy!: string;

  @Column({ type: 'varchar', length: 64, nullable: false })
  updatedBy!: string;

  @VersionColumn()
  version!: number;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.tenantId) {
      throw new Error(
        'FP-011 VIOLATION: Entity cannot be persisted without tenantId. ' +
        'All entities MUST have tenant context.'
      );
    }
  }

  @BeforeUpdate()
  validateTenantOnUpdate(): void {
    if (!this.tenantId) {
      throw new Error(
        'FP-011 VIOLATION: Entity tenantId cannot be null on update.'
      );
    }
  }
}

// Audit-specific entity (append-only, K3)
export abstract class AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, nullable: false })
  @Index('idx_audit_tenant')
  tenantId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp!: Date;

  @BeforeInsert()
  generateAuditId(): void {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
