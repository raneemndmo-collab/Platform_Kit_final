import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPlan, Invoice, Payment, UsageRecord } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(BillingPlan, 'm29_connection') private planRepo: Repository<BillingPlan>,
    @InjectRepository(Invoice, 'm29_connection') private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Payment, 'm29_connection') private paymentRepo: Repository<Payment>,
    @InjectRepository(UsageRecord, 'm29_connection') private usageRepo: Repository<UsageRecord>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPlan(tenantId: string, data: { planName: string; basePrice: number; billingCycle: string; currency: string; features: unknown; usageLimits?: unknown }): Promise<BillingPlan> {
    return this.planRepo.save(this.planRepo.create({ tenantId, ...data }));
  }

  async getActivePlan(tenantId: string): Promise<BillingPlan | null> {
    return this.planRepo.findOne({ where: { tenantId, isActive: true } });
  }

  async generateInvoice(tenantId: string, data: { billingPeriod: string; lineItems: unknown[]; currency?: string }): Promise<Invoice> {
    const subtotal = data.lineItems.reduce((sum: number, item: unknown) => sum + (item.amount || 0), 0);
    const tax = subtotal * 0.15; // 15% VAT
    const invoice = await this.invoiceRepo.save(this.invoiceRepo.create({
      tenantId, invoiceNumber: `INV-${Date.now()}`, billingPeriod: data.billingPeriod,
      subtotal, tax, total: subtotal + tax, currency: data.currency || 'SAR',
      lineItems: data.lineItems, status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 3600000),
    }));
    this.safeEmit('billing.invoice.generated', { tenantId, invoiceId: invoice.id, total: invoice.total });
    return invoice;
  }

  async listInvoices(tenantId: string, status?: string): Promise<Invoice[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.invoiceRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async processPayment(tenantId: string, data: { invoiceId: string; amount: number; paymentMethod: string; transactionId?: string }): Promise<Payment> {
    const payment = await this.paymentRepo.save(this.paymentRepo.create({ tenantId, ...data, currency: 'SAR', status: 'completed' }));
    await this.invoiceRepo.update({ id: data.invoiceId, tenantId }, { status: 'paid', paidAt: new Date() });
    this.safeEmit('billing.payment.processed', { tenantId, invoiceId: data.invoiceId, amount: data.amount });
    return payment;
  }

  async recordUsage(tenantId: string, data: { metricName: string; period: string; quantity: number; unitPrice?: number }): Promise<UsageRecord> {
    const totalPrice = data.unitPrice ? data.quantity * data.unitPrice : undefined;
    return this.usageRepo.save(this.usageRepo.create({ tenantId, ...data, totalPrice }));
  }

  async getUsageSummary(tenantId: string, period: string): Promise<UsageRecord[]> {
    return this.usageRepo.find({ where: { tenantId, period } });
  }

  async getOverdueInvoices(tenantId: string): Promise<Invoice[]> {
    return this.invoiceRepo.createQueryBuilder('inv')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.status = :status', { status: 'pending' })
      .andWhere('inv.dueDate < :now', { now: new Date() })
      .getMany();
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.planRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
