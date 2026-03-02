// =============================================================================
// M2: Finance — Domain Entities
// Constitutional: Part 4.1 — M2
// Entities: Account, Ledger, Invoice, Payment, Budget, BudgetAllocation, TaxRecord
// Database: finance_db (Tier 1 physically isolated). ACID-critical.
// FORBIDDEN: Direct access to any non-finance database.
// =============================================================================

import { Entity, Column, Index } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('accounts')
export class AccountEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() accountNumber: string;
  @Column() name: string;
  @Column() type: string; // asset, liability, equity, revenue, expense
  @Column() category: string;
  @Column({ nullable: true }) parentAccountId: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) balance: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) description: string;
}

@Entity('ledger_entries')
export class LedgerEntryEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() journalId: string;
  @Column() accountId: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) debit: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) credit: number;
  @Column() description: string;
  @Column({ type: 'date' }) @Index() transactionDate: Date;
  @Column({ nullable: true }) referenceType: string;
  @Column({ nullable: true }) referenceId: string;
  @Column({ default: 'posted' }) status: string;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ nullable: true }) @Index() fiscalPeriod: string;
}

@Entity('invoices')
export class InvoiceEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() invoiceNumber: string;
  @Column() type: string; // sales, purchase
  @Column({ nullable: true }) customerId: string;
  @Column({ nullable: true }) vendorId: string;
  @Column({ type: 'date' }) issueDate: Date;
  @Column({ type: 'date' }) dueDate: Date;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) subtotal: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) taxAmount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) totalAmount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) paidAmount: number;
  @Column({ default: 'draft' }) @Index() status: string; // draft, sent, approved, paid, overdue, cancelled
  @Column({ default: 'SAR' }) currency: string;
  @Column({ type: 'jsonb', nullable: true }) lineItems: Record<string, unknown>[];
  @Column({ nullable: true }) notes: string;
}

@Entity('payments')
export class PaymentEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() invoiceId: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) amount: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column() method: string; // bank_transfer, cash, cheque, card
  @Column({ nullable: true }) referenceNumber: string;
  @Column({ type: 'date' }) paymentDate: Date;
  @Column({ default: 'completed' }) status: string;
  @Column({ nullable: true }) notes: string;
}

@Entity('budgets')
export class BudgetEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() name: string;
  @Column() @Index() fiscalYear: string;
  @Column({ nullable: true }) departmentId: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) totalAmount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) allocatedAmount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) spentAmount: number;
  @Column({ default: 'active' }) status: string;
  @Column({ default: 'SAR' }) currency: string;
}

@Entity('tax_records')
export class TaxRecordEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() taxType: string; // VAT, income, withholding
  @Column() @Index() fiscalPeriod: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) taxableAmount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) taxAmount: number;
  @Column({ type: 'decimal', precision: 4, scale: 2 }) taxRate: number;
  @Column({ default: 'calculated' }) status: string;
  @Column({ nullable: true }) referenceType: string;
  @Column({ nullable: true }) referenceId: string;

export {
  AccountEntity, LedgerEntryEntity, InvoiceEntity,
  PaymentEntity, BudgetEntity, TaxRecordEntity,
};
}
