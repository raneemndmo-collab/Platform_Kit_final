// M9: Compliance Management - Domain Entities
// Database: compliance_db | Event Namespace: compliance.*
// Purpose: Regulatory compliance tracking, policy enforcement, risk assessment, audit trails

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('compliance_frameworks')
@Index(['tenantId', 'status'])
export class ComplianceFramework {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string; // ISO 27001, GDPR, SOX, HIPAA, etc.

  @Column({ nullable: true })
  description: string;

  @Column()
  version: string;

  @Column({ default: 'active' })
  status: string; // active, draft, archived

  @Column({ type: 'jsonb', nullable: true })
  requirements: ComplianceRequirement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface ComplianceRequirement {
  requirementId: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

@Entity('compliance_controls')
@Index(['tenantId', 'frameworkId'])
@Index(['tenantId', 'status'])
export class ComplianceControl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  frameworkId: string;

  @Column()
  requirementId: string;

  @Column()
  controlName: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  type: string; // preventive, detective, corrective

  @Column({ default: 'not_assessed' })
  status: string; // compliant, non_compliant, partially_compliant, not_assessed

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: Record<string, unknown>[];

  @Column({ type: 'date', nullable: true })
  lastAssessedAt: Date;

  @Column({ type: 'date', nullable: true })
  nextAssessmentDue: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('compliance_assessments')
@Index(['tenantId', 'frameworkId'])
export class ComplianceAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  frameworkId: string;

  @Column()
  assessorId: string;

  @Column({ default: 'in_progress' })
  status: string; // in_progress, completed, approved

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  complianceScore: number;

  @Column({ type: 'jsonb', nullable: true })
  findings: AssessmentFinding[];

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

export interface AssessmentFinding {
  controlId: string;
  status: string;
  finding: string;
  recommendation: string;
  severity: string;
}

@Entity('compliance_risks')
@Index(['tenantId', 'riskLevel'])
export class ComplianceRisk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  category: string;

  @Column()
  riskLevel: string; // critical, high, medium, low

  @Column({ type: 'int', default: 1 })
  likelihood: number; // 1-5

  @Column({ type: 'int', default: 1 })
  impact: number; // 1-5

  @Column({ nullable: true })
  mitigationPlan: string;

  @Column({ default: 'open' })
  status: string; // open, mitigated, accepted, closed

  @Column({ nullable: true })
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('compliance_violations')
@Index(['tenantId', 'severity'])
export class ComplianceViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  controlId: string;

  @Column()
  violationType: string;

  @Column()
  severity: string; // critical, high, medium, low

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'open' })
  status: string; // open, investigating, resolved, waived

  @Column({ nullable: true })
  remediationPlan: string;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  detectedAt: Date;
}
