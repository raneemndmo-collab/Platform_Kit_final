// =============================================================================
// M5: Procurement — Domain Entities
// Entities: Vendor, PurchaseOrder, PurchaseOrderLine, ApprovalChain, ReceivingNote, VendorEvaluation
// Database: procurement_db. FORBIDDEN: access to inventory_db, finance_db.
// FORBIDDEN: Directly updating stock levels (M4's responsibility via events).
// =============================================================================

import { Entity, Column, Index } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('vendors')
export class VendorEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() name: string;
  @Column() @Index() code: string;
  @Column({ nullable: true }) contactPerson: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) taxId: string;
  @Column({ default: 'active' }) @Index() status: string; // active, suspended, blacklisted
  @Column({ default: 'pending' }) verificationStatus: string; // pending, verified, rejected
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true }) rating: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ type: 'jsonb', nullable: true }) bankDetails: Record<string, unknown>;
  @Column({ type: 'simple-array', nullable: true }) categories: string[];
  @Column({ nullable: true }) paymentTerms: string; // net_30, net_60, immediate
}

@Entity('purchase_orders')
export class PurchaseOrderEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() poNumber: string;
  @Column() vendorId: string;
  @Column({ default: 'draft' }) @Index() status: string; // draft, pending_approval, approved, sent, partially_received, received, cancelled
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) subtotal: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) taxAmount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 }) totalAmount: number;
  @Column({ default: 'SAR' }) currency: string;
  @Column({ type: 'date', nullable: true }) expectedDeliveryDate: Date;
  @Column({ nullable: true }) deliveryAddress: string;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) approvedBy: string;
  @Column({ nullable: true }) approvedAt: Date;
  @Column({ nullable: true }) sentAt: Date;
}

@Entity('purchase_order_lines')
export class PurchaseOrderLineEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() purchaseOrderId: string;
  @Column() itemId: string;
  @Column() itemName: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) quantity: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) receivedQuantity: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) unitPrice: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) lineTotal: number;
  @Column({ nullable: true }) unit: string;
  @Column({ nullable: true }) notes: string;
}

@Entity('approval_chains')
export class ApprovalChainEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() referenceType: string; // purchase_order
  @Column() @Index() referenceId: string;
  @Column() stepNumber: number;
  @Column() approverId: string;
  @Column({ default: 'pending' }) status: string; // pending, approved, rejected, skipped
  @Column({ nullable: true }) comment: string;
  @Column({ nullable: true }) decidedAt: Date;
}

@Entity('receiving_notes')
export class ReceivingNoteEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() purchaseOrderId: string;
  @Column() @Index() receiptNumber: string;
  @Column({ type: 'date' }) receivedDate: Date;
  @Column() receivedBy: string;
  @Column({ type: 'jsonb' }) items: Record<string, unknown>[]; // [{itemId, quantityReceived, quantityRejected, notes}]
  @Column({ default: 'completed' }) status: string;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) warehouseId: string;
}

@Entity('vendor_evaluations')
export class VendorEvaluationEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() vendorId: string;
  @Column() evaluatorId: string;
  @Column() period: string;
  @Column({ type: 'decimal', precision: 3, scale: 1 }) qualityScore: number;
  @Column({ type: 'decimal', precision: 3, scale: 1 }) deliveryScore: number;
  @Column({ type: 'decimal', precision: 3, scale: 1 }) priceScore: number;
  @Column({ type: 'decimal', precision: 3, scale: 1 }) overallScore: number;
  @Column({ nullable: true }) comments: string;

export {
  VendorEntity, PurchaseOrderEntity, PurchaseOrderLineEntity,
  ApprovalChainEntity, ReceivingNoteEntity, VendorEvaluationEntity,
};
}
