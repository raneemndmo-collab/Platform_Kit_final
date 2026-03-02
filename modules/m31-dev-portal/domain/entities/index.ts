import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('api_keys')
@Index(['tenantId', 'keyHash'])
@Index(['tenantId', 'status'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column() keyPrefix: string;
  @Column() keyHash: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb' }) scopes: string[];
  @Column({ type: 'jsonb', nullable: true }) rateLimits: Record<string, number>;
  @Column({ type: 'jsonb', nullable: true }) allowedIPs: string[];
  @Column({ nullable: true }) createdBy: string;
  @Column({ type: 'timestamp', nullable: true }) expiresAt: Date;
  @Column({ type: 'timestamp', nullable: true }) lastUsedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('api_documentation')
@Index(['tenantId', 'moduleId', 'version'])
export class ApiDocumentation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() moduleId: string;
  @Column() version: string;
  @Column({ type: 'text' }) openApiSpec: string;
  @Column({ default: 'draft' }) status: string;
  @Column({ type: 'timestamp', nullable: true }) publishedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('sandbox_environments')
@Index(['tenantId'])
export class SandboxEnvironment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() name: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) config: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) mockData: Record<string, unknown>;
  @Column({ nullable: true }) baseUrl: string;
  @Column({ type: 'timestamp', nullable: true }) expiresAt: Date;
  @Column({ nullable: true }) createdBy: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('api_usage_stats')
@Index(['tenantId', 'apiKeyId', 'period'])
export class ApiUsageStats {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() apiKeyId: string;
  @Column() endpoint: string;
  @Column() period: string;
  @Column({ type: 'int', default: 0 }) requestCount: number;
  @Column({ type: 'int', default: 0 }) errorCount: number;
  @Column({ type: 'int', nullable: true }) avgLatencyMs: number;
  @Column({ type: 'int', nullable: true }) p95LatencyMs: number;
  @CreateDateColumn() recordedAt: Date;
}
