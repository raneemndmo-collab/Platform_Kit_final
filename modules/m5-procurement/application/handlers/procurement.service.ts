// =============================================================================
// M5: Procurement — Application Service
// Commands: CreatePO, ApprovePO, ReceiveGoods, EvaluateVendor, OnboardVendor
// Queries: GetPO, ListVendors, GetApprovalStatus
// Events: procurement.order.created/approved/received, procurement.vendor.onboarded
// Subscribes: inventory.stock.low
// =============================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  VendorEntity, PurchaseOrderEntity, PurchaseOrderLineEntity,
  ApprovalChainEntity, ReceivingNoteEntity, VendorEvaluationEntity,
} from '../../domain/entities';

@Injectable()
export class M5ProcurementService {
  private safeEmit(event: string, data: unknown): void { try { this.safeEmit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } } // B3 FIX
  private readonly logger = new Logger(M5ProcurementService.name);

  constructor(
    @InjectRepository(VendorEntity, 'm5_connection') private readonly vendorRepo: Repository<VendorEntity>,
    @InjectRepository(PurchaseOrderEntity, 'm5_connection') private readonly poRepo: Repository<PurchaseOrderEntity>,
    @InjectRepository(PurchaseOrderLineEntity, 'm5_connection') private readonly lineRepo: Repository<PurchaseOrderLineEntity>,
    @InjectRepository(ApprovalChainEntity, 'm5_connection') private readonly approvalRepo: Repository<ApprovalChainEntity>,
    @InjectRepository(ReceivingNoteEntity, 'm5_connection') private readonly receiptRepo: Repository<ReceivingNoteEntity>,
    @InjectRepository(VendorEvaluationEntity, 'm5_connection') private readonly evalRepo: Repository<VendorEvaluationEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== Vendor Management ====================

  async onboardVendor(tenantId: string, userId: string, dto: Partial<VendorEntity>): Promise<VendorEntity> {
    const vendor = this.vendorRepo.create({ ...dto, tenantId, createdBy: userId, status: 'active' });
    const saved = await this.vendorRepo.save(vendor);

    this.safeEmit('procurement.vendor.onboarded', {
      tenantId, vendorId: saved.id, name: saved.name, timestamp: new Date(),
    });
    return saved;
  }

  async listVendors(tenantId: string, status?: string): Promise<VendorEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.vendorRepo.find({ where, order: { name: 'ASC' } });
  }

  async getVendor(tenantId: string, vendorId: string): Promise<VendorEntity> {
    const v = await this.vendorRepo.findOne({ where: { id: vendorId, tenantId } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async evaluateVendor(tenantId: string, userId: string, dto: Partial<VendorEvaluationEntity>): Promise<VendorEvaluationEntity> {
    const overall = ((Number(dto.qualityScore) + Number(dto.deliveryScore) + Number(dto.priceScore)) / 3);
    const evaluation = this.evalRepo.create({
      ...dto, tenantId, createdBy: userId, evaluatorId: userId, overallScore: Math.round(overall * 10) / 10,
    });
    const saved = await this.evalRepo.save(evaluation);

    // Update vendor rating
    const vendor = await this.vendorRepo.findOne({ where: { id: dto.vendorId, tenantId } });
    if (vendor) {
      vendor.rating = saved.overallScore;
      await this.vendorRepo.save(vendor);
    }
    return saved;
  }

  // ==================== Purchase Orders ====================

  async createPO(tenantId: string, userId: string, dto: {
    vendorId: string; expectedDeliveryDate?: string; notes?: string;
    lines: { itemId: string; itemName: string; quantity: number; unitPrice: number; unit?: string }[];
  }): Promise<PurchaseOrderEntity> {
    const vendor = await this.vendorRepo.findOne({ where: { id: dto.vendorId, tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (vendor.status !== 'active') throw new BadRequestException('Vendor is not active');

    const poNumber = `PO-${Date.now()}`;
    let subtotal = 0;

    const po = this.poRepo.create({
      tenantId, createdBy: userId, poNumber,
      vendorId: dto.vendorId, status: 'draft',
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
      notes: dto.notes,
    });
    const savedPO = await this.poRepo.save(po);

    // Create lines
    for (const line of dto.lines) {
      const lineTotal = line.quantity * line.unitPrice;
      subtotal += lineTotal;
      const poLine = this.lineRepo.create({
        tenantId, createdBy: userId, purchaseOrderId: savedPO.id,
        itemId: line.itemId, itemName: line.itemName,
        quantity: line.quantity, unitPrice: line.unitPrice,
        lineTotal, unit: line.unit,
      });
      await this.lineRepo.save(poLine);
    }

    const taxAmount = subtotal * 0.15; // VAT 15%
    savedPO.subtotal = subtotal;
    savedPO.taxAmount = taxAmount;
    savedPO.totalAmount = subtotal + taxAmount;
    await this.poRepo.save(savedPO);

    this.safeEmit('procurement.order.created', {
      tenantId, orderId: savedPO.id, poNumber, vendorId: dto.vendorId,
      totalAmount: savedPO.totalAmount, timestamp: new Date(),
    });

    return savedPO;
  }

  async approvePO(tenantId: string, approverId: string, poId: string): Promise<PurchaseOrderEntity> {
    const po = await this.poRepo.findOne({ where: { id: poId, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft' && po.status !== 'pending_approval') throw new BadRequestException('PO cannot be approved');

    po.status = 'approved';
    po.approvedBy = approverId;
    po.approvedAt = new Date();
    const saved = await this.poRepo.save(po);

    // Record approval step
    const approval = this.approvalRepo.create({
      tenantId, createdBy: approverId, referenceType: 'purchase_order',
      referenceId: poId, stepNumber: 1, approverId, status: 'approved', decidedAt: new Date(),
    });
    await this.approvalRepo.save(approval);

    this.safeEmit('procurement.order.approved', {
      tenantId, orderId: saved.id, poNumber: saved.poNumber,
      totalAmount: saved.totalAmount, vendorId: saved.vendorId, timestamp: new Date(),
    });
    return saved;
  }

  async getPO(tenantId: string, poId: string): Promise<{ order: PurchaseOrderEntity; lines: PurchaseOrderLineEntity[] }> {
    const order = await this.poRepo.findOne({ where: { id: poId, tenantId } });
    if (!order) throw new NotFoundException('Purchase order not found');
    const lines = await this.lineRepo.find({ where: { purchaseOrderId: poId, tenantId } });
    return { order, lines };
  }

  async listPOs(tenantId: string, status?: string): Promise<PurchaseOrderEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.poRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ==================== Receiving ====================

  async receiveGoods(tenantId: string, userId: string, dto: {
    purchaseOrderId: string; warehouseId: string;
    items: { itemId: string; quantityReceived: number; quantityRejected?: number; notes?: string }[];
  }): Promise<ReceivingNoteEntity> {
    const po = await this.poRepo.findOne({ where: { id: dto.purchaseOrderId, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'approved' && po.status !== 'sent' && po.status !== 'partially_received') {
      throw new BadRequestException('PO is not ready for receiving');
    }

    const receiptNumber = `GRN-${Date.now()}`;
    const receipt = this.receiptRepo.create({
      tenantId, createdBy: userId, purchaseOrderId: dto.purchaseOrderId,
      receiptNumber, receivedDate: new Date(), receivedBy: userId,
      items: dto.items, warehouseId: dto.warehouseId,
    });
    const saved = await this.receiptRepo.save(receipt);

    // Update PO line received quantities
    for (const item of dto.items) {
      const line = await this.lineRepo.findOne({
        where: { purchaseOrderId: dto.purchaseOrderId, itemId: item.itemId, tenantId },
      });
      if (line) {
        line.receivedQuantity = Number(line.receivedQuantity) + item.quantityReceived;
        await this.lineRepo.save(line);
      }
    }

    // Check if fully received
    const lines = await this.lineRepo.find({ where: { purchaseOrderId: dto.purchaseOrderId, tenantId } });
    const fullyReceived = lines.every(l => Number(l.receivedQuantity) >= Number(l.quantity));
    po.status = fullyReceived ? 'received' : 'partially_received';
    await this.poRepo.save(po);

    this.safeEmit('procurement.order.received', {
      tenantId, orderId: po.id, receiptId: saved.id,
      warehouseId: dto.warehouseId, items: dto.items, fullyReceived, timestamp: new Date(),
    });

    return saved;
  }

  async getApprovalStatus(tenantId: string, referenceId: string): Promise<ApprovalChainEntity[]> {
    return this.approvalRepo.find({
      where: { tenantId, referenceId },
      order: { stepNumber: 'ASC' },
    });
  }

  // ==================== Event Subscribers (COM-001) ====================

  @OnEvent('inventory.stock.low')
  async handleStockLow(event: unknown): Promise<void> {
    this.logger.warn(`Procurement received low stock alert: item=${event.itemId}, qty=${event.currentQuantity}`);
    // Could auto-generate PO suggestion
  }
}
