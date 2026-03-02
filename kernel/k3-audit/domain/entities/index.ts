import { Entity, Column, Index } from 'typeorm';
import { AuditBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('audit_records')
@Index('idx_audit_user', ['userId'])
@Index('idx_audit_module', ['moduleId'])
@Index('idx_audit_resource', ['resourceType', 'resourceId'])
@Index('idx_audit_time', ['timestamp'])
export class AuditRecordEntity extends AuditBaseEntity {
  @Column({ type: 'varchar', length: 64 }) userId!: string;
  @Column({ type: 'varchar', length: 32 }) moduleId!: string;
  @Column({ type: 'varchar', length: 128 }) action!: string;
  @Column({ type: 'varchar', length: 128 }) resourceType!: string;
  @Column({ type: 'varchar', length: 64 }) resourceId!: string;
  @Column({ type: 'varchar', length: 16 }) outcome!: 'success' | 'failure' | 'denied';
  @Column({ type: 'jsonb', default: '{}' }) details!: Record<string, unknown>;
  @Column({ type: 'varchar', length: 64 }) ipAddress!: string;
  @Column({ type: 'varchar', length: 512 }) userAgent!: string;
  @Column({ type: 'varchar', length: 64 }) correlationId!: string;
  @Column({ type: 'varchar', length: 32, default: 'write' }) classification!: string;
}
