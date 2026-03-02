// =============================================================================
// M4: Inventory — Application Service
// Commands: ReceiveStock, IssueStock, TransferStock, AdjustStock, SetReorderLevel
// Queries: GetStockLevel, GetMovementHistory, GetValuation
// Events: inventory.stock.received/issued/low/adjusted
// Subscribes: procurement.order.received
// =============================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ItemEntity, StockLevelEntity, WarehouseEntity, StockMovementEntity, StockValuationEntity } from '../../domain/entities';

@Injectable()
export class M4InventoryService {
  private safeEmit(event: string, data: unknown): void { try { this.safeEmit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } } // B3 FIX
  private readonly logger = new Logger(M4InventoryService.name);

  constructor(
    @InjectRepository(ItemEntity, 'm4_connection') private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(StockLevelEntity, 'm4_connection') private readonly stockRepo: Repository<StockLevelEntity>,
    @InjectRepository(WarehouseEntity, 'm4_connection') private readonly warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(StockMovementEntity, 'm4_connection') private readonly movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(StockValuationEntity, 'm4_connection') private readonly valuationRepo: Repository<StockValuationEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== Items ====================

  async createItem(tenantId: string, userId: string, dto: Partial<ItemEntity>): Promise<ItemEntity> {
    const item = this.itemRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.itemRepo.save(item);
  }

  async getItem(tenantId: string, itemId: string): Promise<ItemEntity> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async listItems(tenantId: string, category?: string): Promise<ItemEntity[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (category) where.category = category;
    return this.itemRepo.find({ where, order: { name: 'ASC' } });
  }

  // ==================== Warehouses ====================

  async createWarehouse(tenantId: string, userId: string, dto: Partial<WarehouseEntity>): Promise<WarehouseEntity> {
    const wh = this.warehouseRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.warehouseRepo.save(wh);
  }

  async getWarehouses(tenantId: string): Promise<WarehouseEntity[]> {
    return this.warehouseRepo.find({ where: { tenantId, isActive: true } });
  }

  // ==================== Stock Operations ====================

  async receiveStock(tenantId: string, userId: string, dto: {
    itemId: string; warehouseId: string; quantity: number;
    unitCost?: number; referenceType?: string; referenceId?: string;
  }): Promise<StockMovementEntity> {
    // Record movement
    const movement = this.movementRepo.create({
      ...dto, tenantId, createdBy: userId, movementType: 'receive',
    });
    const saved = await this.movementRepo.save(movement);

    // Update stock level
    await this.updateStockLevel(tenantId, dto.itemId, dto.warehouseId, dto.quantity);

    this.safeEmit('inventory.stock.received', {
      tenantId, itemId: dto.itemId, warehouseId: dto.warehouseId,
      quantity: dto.quantity, timestamp: new Date(),
    });

    return saved;
  }

  async issueStock(tenantId: string, userId: string, dto: {
    itemId: string; warehouseId: string; quantity: number;
    referenceType?: string; referenceId?: string; reason?: string;
  }): Promise<StockMovementEntity> {
    // Check available stock
    const stock = await this.getStockLevel(tenantId, dto.itemId, dto.warehouseId);
    const available = Number(stock.quantity) - Number(stock.reservedQuantity);
    if (available < dto.quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${available}, Requested: ${dto.quantity}`);
    }

    const movement = this.movementRepo.create({
      ...dto, tenantId, createdBy: userId, movementType: 'issue',
    });
    const saved = await this.movementRepo.save(movement);

    // Decrease stock
    await this.updateStockLevel(tenantId, dto.itemId, dto.warehouseId, -dto.quantity);

    this.safeEmit('inventory.stock.issued', {
      tenantId, itemId: dto.itemId, warehouseId: dto.warehouseId,
      quantity: dto.quantity, timestamp: new Date(),
    });

    // Check reorder level
    await this.checkReorderLevel(tenantId, dto.itemId, dto.warehouseId);

    return saved;
  }

  async transferStock(tenantId: string, userId: string, dto: {
    itemId: string; fromWarehouseId: string; toWarehouseId: string;
    quantity: number; reason?: string;
  }): Promise<void> {
    // Issue from source
    await this.issueStock(tenantId, userId, {
      itemId: dto.itemId, warehouseId: dto.fromWarehouseId,
      quantity: dto.quantity, referenceType: 'transfer', reason: dto.reason,
    });

    // Receive at destination
    await this.receiveStock(tenantId, userId, {
      itemId: dto.itemId, warehouseId: dto.toWarehouseId,
      quantity: dto.quantity, referenceType: 'transfer',
    });
  }

  async adjustStock(tenantId: string, userId: string, dto: {
    itemId: string; warehouseId: string; newQuantity: number; reason: string;
  }): Promise<StockMovementEntity> {
    const stock = await this.getStockLevel(tenantId, dto.itemId, dto.warehouseId);
    const difference = dto.newQuantity - Number(stock.quantity);

    const movement = this.movementRepo.create({
      tenantId, createdBy: userId, itemId: dto.itemId,
      warehouseId: dto.warehouseId, movementType: 'adjust',
      quantity: difference, reason: dto.reason,
    });
    const saved = await this.movementRepo.save(movement);

    stock.quantity = dto.newQuantity;
    await this.stockRepo.save(stock);

    this.safeEmit('inventory.stock.adjusted', {
      tenantId, itemId: dto.itemId, warehouseId: dto.warehouseId,
      oldQuantity: Number(stock.quantity) - difference,
      newQuantity: dto.newQuantity, reason: dto.reason, timestamp: new Date(),
    });

    return saved;
  }

  async setReorderLevel(tenantId: string, userId: string, itemId: string, warehouseId: string, level: number, qty: number): Promise<StockLevelEntity> {
    const stock = await this.getStockLevel(tenantId, itemId, warehouseId);
    stock.reorderLevel = level;
    stock.reorderQuantity = qty;
    stock.updatedBy = userId;
    return this.stockRepo.save(stock);
  }

  // ==================== Queries ====================

  async getStockLevel(tenantId: string, itemId: string, warehouseId: string): Promise<StockLevelEntity> {
    let stock = await this.stockRepo.findOne({ where: { tenantId, itemId, warehouseId } });
    if (!stock) {
      stock = this.stockRepo.create({ tenantId, itemId, warehouseId, quantity: 0, reservedQuantity: 0 });
      stock = await this.stockRepo.save(stock);
    }
    return stock;
  }

  async getStockLevels(tenantId: string, warehouseId?: string): Promise<StockLevelEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (warehouseId) where.warehouseId = warehouseId;
    return this.stockRepo.find({ where });
  }

  async getMovementHistory(tenantId: string, itemId: string, limit = 50): Promise<StockMovementEntity[]> {
    return this.movementRepo.find({
      where: { tenantId, itemId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getValuation(tenantId: string, itemId?: string): Promise<StockValuationEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (itemId) where.itemId = itemId;
    return this.valuationRepo.find({ where, order: { valuationDate: 'DESC' } });
  }

  // ==================== Internal Helpers ====================

  private async updateStockLevel(tenantId: string, itemId: string, warehouseId: string, quantityDelta: number): Promise<void> {
    const stock = await this.getStockLevel(tenantId, itemId, warehouseId);
    stock.quantity = Number(stock.quantity) + quantityDelta;
    await this.stockRepo.save(stock);
  }

  private async checkReorderLevel(tenantId: string, itemId: string, warehouseId: string): Promise<void> {
    const stock = await this.getStockLevel(tenantId, itemId, warehouseId);
    if (stock.reorderLevel && Number(stock.quantity) <= Number(stock.reorderLevel)) {
      this.safeEmit('inventory.stock.low', {
        tenantId, itemId, warehouseId,
        currentQuantity: stock.quantity, reorderLevel: stock.reorderLevel,
        reorderQuantity: stock.reorderQuantity, timestamp: new Date(),
      });
      this.logger.warn(`Stock low: item=${itemId}, qty=${stock.quantity}, reorder=${stock.reorderLevel}`);
    }
  }

  // ==================== Event Subscribers (COM-001) ====================

  @OnEvent('procurement.order.received')
  async handleProcurementReceived(event: unknown): Promise<void> {
    this.logger.log(`Inventory received procurement event: PO ${event.orderId}`);
    // Auto-receive stock from completed PO
  }

  // A3 FIX: Bulk stock adjustment — single DB write
  async bulkAdjustStock(tenantId: string, adjustments: Array<{ itemId: string; warehouseId: string; quantity: number; reason: string }>): Promise<{ adjusted: number }> {
    const entities = adjustments.map(a => this.txnRepo.create({ tenantId, ...a, type: 'adjustment', adjustedAt: new Date() }));
    await this.txnRepo.save(entities);
    return { adjusted: entities.length };
  }
}
