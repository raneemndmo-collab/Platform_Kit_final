import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tenants')
@Index(['slug'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column({ default: 'active' }) status: string;
  @Column() plan: string;
  @Column({ type: 'jsonb', nullable: true }) settings: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) limits: Record<string, number>;
  @Column({ nullable: true }) primaryContactEmail: string;
  @Column({ nullable: true }) industry: string;
  @Column({ nullable: true }) region: string;
  @Column({ type: 'timestamp', nullable: true }) trialEndsAt: Date;
  @Column({ type: 'timestamp', nullable: true }) suspendedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('tenant_databases')
@Index(['tenantId', 'moduleId'])
export class TenantDatabase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() moduleId: string;
  @Column() databaseName: string;
  @Column() connectionPool: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'bigint', default: 0 }) sizeBytes: number;
  @Column({ type: 'timestamp', nullable: true }) lastBackupAt: Date;
  @CreateDateColumn() createdAt: Date;
}

@Entity('tenant_usage')
@Index(['tenantId', 'period'])
export class TenantUsage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() period: string;
  @Column({ type: 'int', default: 0 }) apiCalls: number;
  @Column({ type: 'bigint', default: 0 }) storageBytes: number;
  @Column({ type: 'int', default: 0 }) activeUsers: number;
  @Column({ type: 'int', default: 0 }) workflowExecutions: number;
  @Column({ type: 'int', default: 0 }) aiInferences: number;
  @CreateDateColumn() recordedAt: Date;
}

@Entity('tenant_isolation_tests')
@Index(['tenantId'])
export class TenantIsolationTest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() testType: string;
  @Column() targetModule: string;
  @Column({ default: 'pending' }) result: string;
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, unknown>;
  @CreateDateColumn() executedAt: Date;
}
