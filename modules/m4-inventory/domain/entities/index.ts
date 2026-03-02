// =============================================================================
// M4: Inventory — Domain Entities
// Entities: Item, StockLevel, Warehouse, Location, StockMovement, StockValuation
// Database: inventory_db. FORBIDDEN: access to procurement_db, finance_db.
// =============================================================================

import { Entity, Column, Index } from 'typeorm';
import { RasidBaseEntity } from '../../../shared/common-dtos/base.entity';

@Entity('items')
export class ItemEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() sku: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column() category: string;
  @Column({ nullable: true }) unit: string; // piece, kg, liter, box
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) unitCost: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) unitPrice: number;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: 'jsonb', nullable: true }) attributes: Record<string, unknown>;
  @Column({ nullable: true }) barcode: string;
}

@Entity('stock_levels')
export class StockLevelEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() itemId: string;
  @Column() @Index() warehouseId: string;
  @Column({ nullable: true }) locationId: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) quantity: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) reservedQuantity: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) reorderLevel: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) reorderQuantity: number;
  @Column({ nullable: true }) lastCountDate: Date;
}

@Entity('warehouses')
export class WarehouseEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() name: string;
  @Column() @Index() code: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) managerId: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: 'general' }) type: string; // general, cold_storage, hazardous
}

@Entity('stock_movements')
export class StockMovementEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() itemId: string;
  @Column() @Index() warehouseId: string;
  @Column() movementType: string; // receive, issue, transfer, adjust, return
  @Column({ type: 'decimal', precision: 12, scale: 2 }) quantity: number;
  @Column({ nullable: true }) fromLocationId: string;
  @Column({ nullable: true }) toLocationId: string;
  @Column({ nullable: true }) referenceType: string; // PO, SO, transfer, adjustment
  @Column({ nullable: true }) referenceId: string;
  @Column({ nullable: true }) reason: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) unitCost: number;
}

@Entity('stock_valuations')
export class StockValuationEntity extends RasidBaseEntity {
  // tenantId: inherited from RasidBaseEntity — P-016, TNT-001 enforced
  @Column() @Index() itemId: string;
  @Column() valuationMethod: string; // FIFO, LIFO, weighted_average
  @Column({ type: 'decimal', precision: 12, scale: 2 }) totalQuantity: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) totalValue: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) averageCost: number;
  @Column({ type: 'date' }) valuationDate: Date;
}

export { ItemEntity, StockLevelEntity, WarehouseEntity, StockMovementEntity, StockValuationEntity };
