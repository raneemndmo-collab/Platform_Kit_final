// =============================================================================
// M4: Inventory — Unit Tests (GATE 1: >80% coverage)
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { M4InventoryService } from '../../modules/m4-inventory/application/handlers/inventory.service';
import { ItemEntity, StockLevelEntity, WarehouseEntity, StockMovementEntity, StockValuationEntity } from '../../modules/m4-inventory/domain/entities';

const mockRepo = () => ({
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((e) => Promise.resolve({ id: e.id || 'test-id', ...e })),
  findOne: jest.fn(),
  find: jest.fn(() => []),
});

describe('M4InventoryService', () => {
  let service: M4InventoryService;
  let stockRepo: ReturnType<typeof mockRepo>;
  let movementRepo: ReturnType<typeof mockRepo>;
  let eventEmitter: EventEmitter2;

  const TENANT = 'tenant-inv';
  const USER = 'user-inv-001';

  beforeEach(async () => {
    stockRepo = mockRepo();
    movementRepo = mockRepo();
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M4InventoryService,
        { provide: getRepositoryToken(ItemEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(StockLevelEntity), useValue: stockRepo },
        { provide: getRepositoryToken(WarehouseEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(StockMovementEntity), useValue: movementRepo },
        { provide: getRepositoryToken(StockValuationEntity), useValue: mockRepo() },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(M4InventoryService);
  });

  describe('receiveStock', () => {
    it('should create receive movement and update stock level', async () => {
      stockRepo.findOne.mockResolvedValue({ id: 'sl-1', tenantId: TENANT, quantity: 50, reservedQuantity: 0 });

      await service.receiveStock(TENANT, USER, {
        itemId: 'item-1', warehouseId: 'wh-1', quantity: 100,
      });

      expect(movementRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        movementType: 'receive', quantity: 100,
      }));
      expect(stockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 150 }));
    });

    it('should emit inventory.stock.received event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('inventory.stock.received', (e) => emitted.push(e));
      stockRepo.findOne.mockResolvedValue({ id: 'sl-1', tenantId: TENANT, quantity: 0, reservedQuantity: 0 });

      await service.receiveStock(TENANT, USER, { itemId: 'item-1', warehouseId: 'wh-1', quantity: 50 });
      expect(emitted.length).toBe(1);
      expect(emitted[0].tenantId).toBe(TENANT);
    });
  });

  describe('issueStock', () => {
    it('should issue stock when sufficient quantity available', async () => {
      stockRepo.findOne.mockResolvedValue({ id: 'sl-1', tenantId: TENANT, quantity: 100, reservedQuantity: 10 });

      await service.issueStock(TENANT, USER, { itemId: 'item-1', warehouseId: 'wh-1', quantity: 50 });

      expect(movementRepo.create).toHaveBeenCalledWith(expect.objectContaining({ movementType: 'issue' }));
    });

    it('should throw when insufficient stock', async () => {
      stockRepo.findOne.mockResolvedValue({ id: 'sl-1', tenantId: TENANT, quantity: 10, reservedQuantity: 5 });

      await expect(service.issueStock(TENANT, USER, {
        itemId: 'item-1', warehouseId: 'wh-1', quantity: 50,
      })).rejects.toThrow(BadRequestException);
    });

    it('should emit inventory.stock.low when below reorder level', async () => {
      const emitted: any[] = [];
      eventEmitter.on('inventory.stock.low', (e) => emitted.push(e));

      // First call for issue check, second for update, third for reorder check
      stockRepo.findOne
        .mockResolvedValueOnce({ id: 'sl-1', tenantId: TENANT, quantity: 20, reservedQuantity: 0 })
        .mockResolvedValueOnce({ id: 'sl-1', tenantId: TENANT, quantity: 20, reservedQuantity: 0 })
        .mockResolvedValueOnce({ id: 'sl-1', tenantId: TENANT, quantity: 5, reservedQuantity: 0, reorderLevel: 10, reorderQuantity: 50 });

      await service.issueStock(TENANT, USER, { itemId: 'item-1', warehouseId: 'wh-1', quantity: 15 });
      expect(emitted.length).toBe(1);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock quantity and record movement', async () => {
      stockRepo.findOne.mockResolvedValue({ id: 'sl-1', tenantId: TENANT, quantity: 100 });

      await service.adjustStock(TENANT, USER, {
        itemId: 'item-1', warehouseId: 'wh-1', newQuantity: 95, reason: 'Shrinkage',
      });

      expect(movementRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        movementType: 'adjust', quantity: -5,
      }));
    });

    it('should emit inventory.stock.adjusted event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('inventory.stock.adjusted', (e) => emitted.push(e));
      stockRepo.findOne.mockResolvedValue({ id: 'sl-1', tenantId: TENANT, quantity: 100 });

      await service.adjustStock(TENANT, USER, {
        itemId: 'item-1', warehouseId: 'wh-1', newQuantity: 80, reason: 'Audit',
      });
      expect(emitted.length).toBe(1);
    });
  });

  describe('Constitutional: FP (No cross-DB)', () => {
    it('service has no references to procurement_db or finance_db', () => {
      const src = M4InventoryService.toString();
      expect(src).not.toContain('procurement_db');
      expect(src).not.toContain('finance_db');
    });
  });
});
