// =============================================================================
// M5: Procurement — Unit Tests (GATE 1: >80% coverage)
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { M5ProcurementService } from '../../modules/m5-procurement/application/handlers/procurement.service';
import {
  VendorEntity, PurchaseOrderEntity, PurchaseOrderLineEntity,
  ApprovalChainEntity, ReceivingNoteEntity, VendorEvaluationEntity,
} from '../../modules/m5-procurement/domain/entities';

const mockRepo = () => ({
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((e) => Promise.resolve({ id: e.id || 'test-id', ...e })),
  findOne: jest.fn(),
  find: jest.fn(() => []),
});

describe('M5ProcurementService', () => {
  let service: M5ProcurementService;
  let vendorRepo: ReturnType<typeof mockRepo>;
  let poRepo: ReturnType<typeof mockRepo>;
  let lineRepo: ReturnType<typeof mockRepo>;
  let approvalRepo: ReturnType<typeof mockRepo>;
  let receiptRepo: ReturnType<typeof mockRepo>;
  let eventEmitter: EventEmitter2;

  const TENANT = 'tenant-proc';
  const USER = 'user-proc-001';

  beforeEach(async () => {
    vendorRepo = mockRepo();
    poRepo = mockRepo();
    lineRepo = mockRepo();
    approvalRepo = mockRepo();
    receiptRepo = mockRepo();
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M5ProcurementService,
        { provide: getRepositoryToken(VendorEntity), useValue: vendorRepo },
        { provide: getRepositoryToken(PurchaseOrderEntity), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderLineEntity), useValue: lineRepo },
        { provide: getRepositoryToken(ApprovalChainEntity), useValue: approvalRepo },
        { provide: getRepositoryToken(ReceivingNoteEntity), useValue: receiptRepo },
        { provide: getRepositoryToken(VendorEvaluationEntity), useValue: mockRepo() },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(M5ProcurementService);
  });

  describe('createPO', () => {
    it('should create PO with lines and VAT 15%', async () => {
      vendorRepo.findOne.mockResolvedValue({ id: 'v-1', tenantId: TENANT, status: 'active' });

      const dto = {
        vendorId: 'v-1',
        lines: [
          { itemId: 'item-1', itemName: 'Widget', quantity: 100, unitPrice: 50 },
          { itemId: 'item-2', itemName: 'Gadget', quantity: 50, unitPrice: 200 },
        ],
      };

      await service.createPO(TENANT, USER, dto);

      // subtotal = 100*50 + 50*200 = 15000
      // tax = 15000 * 0.15 = 2250
      // total = 17250
      expect(poRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        subtotal: 15000, taxAmount: 2250, totalAmount: 17250,
      }));
    });

    it('should reject PO for inactive vendor', async () => {
      vendorRepo.findOne.mockResolvedValue({ id: 'v-1', tenantId: TENANT, status: 'suspended' });

      await expect(service.createPO(TENANT, USER, {
        vendorId: 'v-1', lines: [{ itemId: 'i1', itemName: 'X', quantity: 1, unitPrice: 10 }],
      })).rejects.toThrow('Vendor is not active');
    });

    it('should emit procurement.order.created event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('procurement.order.created', (e) => emitted.push(e));
      vendorRepo.findOne.mockResolvedValue({ id: 'v-1', tenantId: TENANT, status: 'active' });

      await service.createPO(TENANT, USER, {
        vendorId: 'v-1', lines: [{ itemId: 'i1', itemName: 'X', quantity: 1, unitPrice: 10 }],
      });
      expect(emitted.length).toBe(1);
    });
  });

  describe('approvePO', () => {
    it('should approve draft PO', async () => {
      poRepo.findOne.mockResolvedValue({ id: 'po-1', tenantId: TENANT, status: 'draft', poNumber: 'PO-001', totalAmount: 17250, vendorId: 'v-1' });
      await service.approvePO(TENANT, USER, 'po-1');
      expect(poRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('should emit procurement.order.approved event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('procurement.order.approved', (e) => emitted.push(e));
      poRepo.findOne.mockResolvedValue({ id: 'po-1', tenantId: TENANT, status: 'draft', poNumber: 'PO-001', totalAmount: 17250, vendorId: 'v-1' });

      await service.approvePO(TENANT, USER, 'po-1');
      expect(emitted.length).toBe(1);
    });
  });

  describe('receiveGoods', () => {
    it('should create GRN and update PO status', async () => {
      poRepo.findOne.mockResolvedValue({ id: 'po-1', tenantId: TENANT, status: 'approved' });
      lineRepo.findOne.mockResolvedValue({ purchaseOrderId: 'po-1', itemId: 'i1', quantity: 100, receivedQuantity: 0, tenantId: TENANT });
      lineRepo.find.mockResolvedValue([{ purchaseOrderId: 'po-1', itemId: 'i1', quantity: 100, receivedQuantity: 100 }]);

      await service.receiveGoods(TENANT, USER, {
        purchaseOrderId: 'po-1', warehouseId: 'wh-1',
        items: [{ itemId: 'i1', quantityReceived: 100 }],
      });

      expect(receiptRepo.save).toHaveBeenCalled();
      expect(poRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'received' }));
    });

    it('should emit procurement.order.received event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('procurement.order.received', (e) => emitted.push(e));
      poRepo.findOne.mockResolvedValue({ id: 'po-1', tenantId: TENANT, status: 'approved' });
      lineRepo.findOne.mockResolvedValue({ purchaseOrderId: 'po-1', itemId: 'i1', quantity: 100, receivedQuantity: 0, tenantId: TENANT });
      lineRepo.find.mockResolvedValue([{ quantity: 100, receivedQuantity: 100 }]);

      await service.receiveGoods(TENANT, USER, {
        purchaseOrderId: 'po-1', warehouseId: 'wh-1',
        items: [{ itemId: 'i1', quantityReceived: 100 }],
      });
      expect(emitted.length).toBe(1);
    });
  });
});

// =============================================================================
// M3: CRM — Unit Tests (GATE 1: >80% coverage)
// =============================================================================

import { M3CrmService } from '../../modules/m3-crm/application/handlers/crm.service';
import { ContactEntity, LeadEntity, OpportunityEntity, ActivityEntity, CampaignEntity, SegmentEntity } from '../../modules/m3-crm/domain/entities';

describe('M3CrmService', () => {
  let service: M3CrmService;
  let leadRepo: ReturnType<typeof mockRepo>;
  let oppRepo: ReturnType<typeof mockRepo>;
  let eventEmitter: EventEmitter2;

  const TENANT = 'tenant-crm';
  const USER = 'user-crm-001';

  beforeEach(async () => {
    leadRepo = mockRepo();
    oppRepo = mockRepo();
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M3CrmService,
        { provide: getRepositoryToken(ContactEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(LeadEntity), useValue: leadRepo },
        { provide: getRepositoryToken(OpportunityEntity), useValue: oppRepo },
        { provide: getRepositoryToken(ActivityEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(CampaignEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(SegmentEntity), useValue: mockRepo() },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(M3CrmService);
  });

  describe('createLead', () => {
    it('should create lead with new status', async () => {
      await service.createLead(TENANT, USER, { source: 'website', company: 'ACME' });
      expect(leadRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: TENANT, status: 'new',
      }));
    });

    it('should emit crm.lead.created event', async () => {
      const emitted: any[] = [];
      eventEmitter.on('crm.lead.created', (e) => emitted.push(e));
      await service.createLead(TENANT, USER, { source: 'referral' });
      expect(emitted.length).toBe(1);
    });
  });

  describe('convertLead', () => {
    it('should convert lead to opportunity', async () => {
      leadRepo.findOne.mockResolvedValue({ id: 'lead-1', tenantId: TENANT, status: 'qualified', contactId: 'c-1', assignedTo: USER });

      const result = await service.convertLead(TENANT, USER, 'lead-1', {
        opportunityName: 'ACME Deal', value: 50000,
      });

      expect(leadRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'converted' }));
      expect(oppRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'qualification', value: 50000,
      }));
    });

    it('should reject already converted lead', async () => {
      leadRepo.findOne.mockResolvedValue({ id: 'lead-1', tenantId: TENANT, status: 'converted' });
      await expect(service.convertLead(TENANT, USER, 'lead-1', {
        opportunityName: 'Test', value: 1000,
      })).rejects.toThrow('Lead already converted');
    });
  });

  describe('updateStage', () => {
    it('should update probability based on stage', async () => {
      oppRepo.findOne.mockResolvedValue({ id: 'opp-1', tenantId: TENANT, stage: 'qualification', probability: 30 });

      await service.updateStage(TENANT, USER, 'opp-1', 'proposal');
      expect(oppRepo.save).toHaveBeenCalledWith(expect.objectContaining({ stage: 'proposal', probability: 50 }));
    });

    it('should emit crm.opportunity.won on close', async () => {
      const emitted: any[] = [];
      eventEmitter.on('crm.opportunity.won', (e) => emitted.push(e));
      oppRepo.findOne.mockResolvedValue({ id: 'opp-1', tenantId: TENANT, stage: 'negotiation', value: 50000 });

      await service.updateStage(TENANT, USER, 'opp-1', 'closed_won');
      expect(emitted.length).toBe(1);
      expect(emitted[0].value).toBe(50000);
    });

    it('should emit crm.opportunity.lost on loss', async () => {
      const emitted: any[] = [];
      eventEmitter.on('crm.opportunity.lost', (e) => emitted.push(e));
      oppRepo.findOne.mockResolvedValue({ id: 'opp-1', tenantId: TENANT, stage: 'negotiation', value: 30000 });

      await service.updateStage(TENANT, USER, 'opp-1', 'closed_lost');
      expect(emitted.length).toBe(1);
    });
  });
});
