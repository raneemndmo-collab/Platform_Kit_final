// =============================================================================
// M2: Finance — Application Service
// Commands: CreateInvoice, ApproveInvoice, RecordPayment, AllocateBudget, ClosePeriod
// Queries: GetLedger, GetInvoice, GetBudgetStatus, GetFinancialReport
// Events: finance.invoice.created/approved, finance.payment.received, finance.budget.exceeded
// Subscribes: hrm.payroll.approved, procurement.order.approved
// =============================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  AccountEntity, LedgerEntryEntity, InvoiceEntity,
  PaymentEntity, BudgetEntity, TaxRecordEntity,
} from '../../domain/entities';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class M2FinanceService {
  private safeEmit(event: string, data: unknown): void { try { this.safeEmit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } } // B3 FIX
  private readonly logger = new Logger(M2FinanceService.name);

  constructor(
    @InjectRepository(AccountEntity, 'm2_connection') private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(LedgerEntryEntity, 'm2_connection') private readonly ledgerRepo: Repository<LedgerEntryEntity>,
    @InjectRepository(InvoiceEntity, 'm2_connection') private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(PaymentEntity, 'm2_connection') private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(BudgetEntity, 'm2_connection') private readonly budgetRepo: Repository<BudgetEntity>,
    @InjectRepository(TaxRecordEntity, 'm2_connection') private readonly taxRepo: Repository<TaxRecordEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- Chart of Accounts ---
  async createAccount(tenantId: string, userId: string, dto: Partial<AccountEntity>): Promise<AccountEntity> {
    const account = this.accountRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.accountRepo.save(account);
  }

  async getAccounts(tenantId: string, type?: string): Promise<AccountEntity[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (type) where.type = type;
    return this.accountRepo.find({ where, order: { accountNumber: 'ASC' } });
  }

  // --- Invoicing ---
  async createInvoice(tenantId: string, userId: string, dto: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
    const invoiceNumber = `INV-${Date.now()}`;
    const taxRate = 0.15; // VAT 15%
    const subtotal = Number(dto.subtotal || 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoice = this.invoiceRepo.create({
      ...dto, tenantId, createdBy: userId, invoiceNumber,
      taxAmount, totalAmount, status: 'draft',
    });
    const saved = await this.invoiceRepo.save(invoice);

    this.safeEmit('finance.invoice.created', {
      tenantId, invoiceId: saved.id, invoiceNumber, totalAmount, timestamp: new Date(),
    });
    return saved;
  }

  async approveInvoice(tenantId: string, userId: string, invoiceId: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'draft' && invoice.status !== 'sent') throw new BadRequestException('Cannot approve');

    invoice.status = 'approved';
    invoice.updatedBy = userId;
    const saved = await this.invoiceRepo.save(invoice);

    // Create ledger entries (double-entry)
    const journalId = uuidv4();
    await this.createLedgerEntry(tenantId, userId, journalId, {
      accountId: 'accounts-receivable', debit: Number(invoice.totalAmount), credit: 0,
      description: `Invoice ${invoice.invoiceNumber}`, transactionDate: new Date(),
    });
    await this.createLedgerEntry(tenantId, userId, journalId, {
      accountId: 'revenue', debit: 0, credit: Number(invoice.subtotal),
      description: `Revenue: ${invoice.invoiceNumber}`, transactionDate: new Date(),
    });

    this.safeEmit('finance.invoice.approved', {
      tenantId, invoiceId: saved.id, totalAmount: saved.totalAmount, timestamp: new Date(),
    });
    return saved;
  }

  async getInvoice(tenantId: string, invoiceId: string): Promise<InvoiceEntity> {
    const inv = await this.invoiceRepo.findOne({ where: { id: invoiceId, tenantId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async listInvoices(tenantId: string, status?: string): Promise<InvoiceEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.invoiceRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // --- Payments ---
  async recordPayment(tenantId: string, userId: string, dto: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = this.paymentRepo.create({ ...dto, tenantId, createdBy: userId });
    const saved = await this.paymentRepo.save(payment);

    // Update invoice paid amount
    invoice.paidAmount = Number(invoice.paidAmount) + Number(dto.amount);
    if (invoice.paidAmount >= Number(invoice.totalAmount)) invoice.status = 'paid';
    await this.invoiceRepo.save(invoice);

    this.safeEmit('finance.payment.received', {
      tenantId, paymentId: saved.id, invoiceId: invoice.id,
      amount: dto.amount, timestamp: new Date(),
    });
    return saved;
  }

  // --- Budget ---
  async allocateBudget(tenantId: string, userId: string, dto: Partial<BudgetEntity>): Promise<BudgetEntity> {
    const budget = this.budgetRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.budgetRepo.save(budget);
  }

  async getBudgetStatus(tenantId: string, fiscalYear?: string): Promise<BudgetEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (fiscalYear) where.fiscalYear = fiscalYear;
    return this.budgetRepo.find({ where });
  }

  async recordBudgetSpend(tenantId: string, budgetId: string, amount: number): Promise<BudgetEntity> {
    const budget = await this.budgetRepo.findOne({ where: { id: budgetId, tenantId } });
    if (!budget) throw new NotFoundException('Budget not found');

    budget.spentAmount = Number(budget.spentAmount) + amount;
    if (budget.spentAmount > Number(budget.totalAmount)) {
      this.safeEmit('finance.budget.exceeded', {
        tenantId, budgetId, spent: budget.spentAmount, total: budget.totalAmount,
      });
    }
    return this.budgetRepo.save(budget);
  }

  // --- Ledger ---
  private async createLedgerEntry(tenantId: string, userId: string, journalId: string, dto: unknown): Promise<LedgerEntryEntity> {
    const entry = this.ledgerRepo.create({ ...dto, tenantId, journalId, createdBy: userId });
    return this.ledgerRepo.save(entry);
  }

  async getLedger(tenantId: string, accountId?: string, period?: string): Promise<LedgerEntryEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (accountId) where.accountId = accountId;
    if (period) where.fiscalPeriod = period;
    return this.ledgerRepo.find({ where, order: { transactionDate: 'DESC' } });
  }

  // --- Event Subscribers (COM-001) ---
  @OnEvent('hrm.payroll.approved')
  async handlePayrollApproved(event: unknown): Promise<void> {
    this.logger.log(`Finance received payroll event: ${event.period} — $${event.totalNet}`);
    // Create payroll expense journal entries
  }

  @OnEvent('procurement.order.approved')
  async handleProcurementApproved(event: unknown): Promise<void> {
    this.logger.log(`Finance received procurement event: PO ${event.orderId}`);
    // Create accounts payable entries
  }
}
