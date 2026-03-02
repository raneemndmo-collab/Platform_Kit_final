import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_entries')
@Index(['tenantId', 'entityType', 'entityId'])
@Index(['tenantId', 'userId', 'timestamp'])
@Index(['tenantId', 'action'])
export class AuditEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() action: string;
  @Column() entityType: string;
  @Column() entityId: string;
  @Column() userId: string;
  @Column({ nullable: true }) userEmail: string;
  @Column({ nullable: true }) sourceModule: string;
  @Column({ nullable: true }) ipAddress: string;
  @Column({ nullable: true }) userAgent: string;
  @Column({ type: 'jsonb', nullable: true }) oldValues: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) newValues: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>;
  @Column({ default: 'normal' }) severity: string;
  @Column({ default: false }) isSystemGenerated: boolean;
  @CreateDateColumn() timestamp: Date;
}

@Entity('audit_retention_policies')
@Index(['tenantId'])
export class AuditRetentionPolicy {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() entityType: string;
  @Column({ type: 'int' }) retentionDays: number;
  @Column({ default: 'archive' }) expirationAction: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('audit_exports')
@Index(['tenantId'])
export class AuditExport {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() format: string;
  @Column({ type: 'jsonb' }) filters: Record<string, unknown>;
  @Column({ default: 'pending' }) status: string;
  @Column({ nullable: true }) fileId: string;
  @Column({ type: 'int', nullable: true }) recordCount: number;
  @Column({ nullable: true }) requestedBy: string;
  @CreateDateColumn() requestedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) completedAt: Date;
}
