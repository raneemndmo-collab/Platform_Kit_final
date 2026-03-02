// M10: Legal Contract Management - Domain Entities
// Database: legal_db | Event Namespace: contract.*
// Purpose: Contract lifecycle, clause library, obligation tracking, renewal alerts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('contracts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'counterpartyId'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  contractNumber: string;

  @Column()
  title: string;

  @Column()
  contractType: string; // employment, vendor, nda, service, lease, license

  @Column({ nullable: true })
  counterpartyId: string;

  @Column({ nullable: true })
  counterpartyName: string;

  @Column({ default: 'draft' })
  status: string; // draft, review, negotiation, pending_signature, active, expired, terminated, renewed

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalValue: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ type: 'int', nullable: true })
  renewalNoticeDays: number;

  @Column({ nullable: true })
  fileId: string; // Reference to M25

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('contract_clauses')
@Index(['tenantId', 'contractId'])
export class ContractClause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  contractId: string;

  @Column()
  clauseNumber: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  category: string; // payment, liability, termination, confidentiality, ip, indemnity

  @Column({ default: false })
  isNonStandard: boolean;

  @Column({ nullable: true })
  riskLevel: string; // high, medium, low

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('contract_obligations')
@Index(['tenantId', 'contractId'])
@Index(['tenantId', 'dueDate'])
export class ContractObligation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  contractId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  obligationType: string; // payment, delivery, reporting, compliance

  @Column()
  responsibleParty: string; // us, counterparty, mutual

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ default: 'pending' })
  status: string; // pending, fulfilled, overdue, waived

  @Column({ nullable: true })
  assigneeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('clause_library')
@Index(['tenantId', 'category'])
export class ClauseTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  title: string;

  @Column()
  category: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  jurisdiction: string;

  @Column({ default: true })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('contract_amendments')
@Index(['tenantId', 'contractId'])
export class ContractAmendment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  contractId: string;

  @Column()
  amendmentNumber: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  effectiveDate: Date;

  @Column({ default: 'draft' })
  status: string; // draft, approved, executed

  @Column({ nullable: true })
  fileId: string;

  @CreateDateColumn()
  createdAt: Date;
}
