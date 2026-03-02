// M13: Reporting - Domain Entities
// Database: reporting_db | Event Namespace: report.*
// Purpose: Report definitions, generation, scheduling, templates, export formats, render cluster

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('report_definitions')
@Index(['tenantId', 'category'])
export class ReportDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  category: string; // financial, operational, hr, compliance, analytics, custom

  @Column({ type: 'jsonb' })
  dataSourceConfig: Record<string, unknown>; // Module references, query definitions

  @Column({ type: 'jsonb' })
  columns: ReportColumnDef[]; // Column definitions

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, unknown>; // Configurable filters

  @Column({ type: 'jsonb', nullable: true })
  groupBy: string[];

  @Column({ type: 'jsonb', nullable: true })
  sortBy: SortDef[];

  @Column({ nullable: true })
  templateId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface ReportColumnDef {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  width?: number;
}

export interface SortDef {
  field: string;
  direction: 'ASC' | 'DESC';
}

@Entity('report_executions')
@Index(['tenantId', 'definitionId'])
@Index(['tenantId', 'status'])
export class ReportExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  definitionId: string;

  @Column({ default: 'pending' })
  status: string; // pending, processing, completed, failed, cancelled

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, unknown>; // Runtime filter values

  @Column({ nullable: true })
  outputFormat: string; // pdf, xlsx, csv, html, json

  @Column({ nullable: true })
  outputFileId: string; // Reference to M25

  @Column({ type: 'int', nullable: true })
  rowCount: number;

  @Column({ type: 'int', nullable: true })
  executionTimeMs: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  requestedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('report_schedules')
@Index(['tenantId', 'definitionId'])
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  definitionId: string;

  @Column()
  cronExpression: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, unknown>;

  @Column({ default: 'pdf' })
  outputFormat: string;

  @Column({ type: 'jsonb', nullable: true })
  recipients: string[]; // Email or user IDs

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('report_templates')
@Index(['tenantId', 'category'])
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'text' })
  templateContent: string; // HTML/Handlebars template

  @Column({ type: 'jsonb', nullable: true })
  headerConfig: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  footerConfig: Record<string, unknown>;

  @Column({ nullable: true })
  logoFileId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
