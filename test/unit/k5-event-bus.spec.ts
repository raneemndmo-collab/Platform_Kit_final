// =============================================================================
// K5: Event Bus — Unit Tests
// Tests: Schema registry enforcement, event publishing, namespace ownership
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { K5EventBusService } from '../../kernel/k5-event-bus/application/handlers/event-bus.service';
import {
  EventSchemaEntity, EventSubscriptionEntity,
  DeadLetterEventEntity, EventLogEntity,
} from '../../kernel/k5-event-bus/domain/entities';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn((dto: any) => ({ ...dto, id: 'test-id' })),
  save: jest.fn((entity: any) => Promise.resolve({ ...entity, id: entity.id || 'test-id' })),
  delete: jest.fn(),
  update: jest.fn(),
});

describe('K5EventBusService', () => {
  let service: K5EventBusService;
  let schemaRepo: any;
  let subRepo: any;
  let dlqRepo: any;
  let logRepo: any;
  let eventEmitter: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K5EventBusService,
        { provide: getRepositoryToken(EventSchemaEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(EventSubscriptionEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(DeadLetterEventEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(EventLogEntity), useFactory: mockRepo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(K5EventBusService);
    schemaRepo = module.get(getRepositoryToken(EventSchemaEntity));
    subRepo = module.get(getRepositoryToken(EventSubscriptionEntity));
    dlqRepo = module.get(getRepositoryToken(DeadLetterEventEntity));
    logRepo = module.get(getRepositoryToken(EventLogEntity));
    eventEmitter = module.get(EventEmitter2);
  });

  // --- Schema Registry Tests (ESR-001 through ESR-004) ---

  describe('registerSchema', () => {
    it('should register a new event schema', async () => {
      schemaRepo.findOne.mockResolvedValue(null);

      const result = await service.registerSchema('t1', {
        namespace: 'hrm', eventType: 'hrm.employee.created',
        version: 1, ownerModule: 'M1',
        jsonSchema: { type: 'object' },
      });

      expect(schemaRepo.create).toHaveBeenCalled();
      expect(schemaRepo.save).toHaveBeenCalled();
    });

    it('ESR-004: should reject duplicate schema version', async () => {
      schemaRepo.findOne.mockResolvedValue({ id: '1', version: 1 });

      await expect(service.registerSchema('t1', {
        namespace: 'hrm', eventType: 'hrm.employee.created',
        version: 1, ownerModule: 'M1', jsonSchema: {},
      })).rejects.toThrow('already registered');
    });
  });

  // --- Event Publishing Tests ---

  describe('publish', () => {
    it('should publish event with valid schema', async () => {
      schemaRepo.findOne.mockResolvedValue({
        id: '1', namespace: 'hrm', eventType: 'hrm.employee.created',
        version: 1, ownerModule: 'M1',
      });
      subRepo.find.mockResolvedValue([]);

      const result = await service.publish({
        eventType: 'hrm.employee.created', namespace: 'hrm',
        publisherModule: 'M1', tenantId: 't1',
        payload: { employeeId: '123' },
      });

      expect(result.eventType).toBe('hrm.employee.created');
      expect(result.publisherModule).toBe('M1');
      expect(logRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('ESR-001: should reject unregistered event type', async () => {
      schemaRepo.findOne.mockResolvedValue(null);

      await expect(service.publish({
        eventType: 'unregistered.event', namespace: 'unknown',
        publisherModule: 'M1', tenantId: 't1', payload: {},
      })).rejects.toThrow('ESR-001');
    });

    it('ESR-003: should reject unauthorized namespace publisher', async () => {
      schemaRepo.findOne.mockResolvedValue({
        namespace: 'hrm', eventType: 'hrm.employee.created',
        ownerModule: 'M1', version: 1,
      });

      await expect(service.publish({
        eventType: 'hrm.employee.created', namespace: 'hrm',
        publisherModule: 'M2', // M2 is NOT the owner of hrm namespace
        tenantId: 't1', payload: {},
      })).rejects.toThrow('ESR-003');
    });
  });

  // --- Subscription Tests ---

  describe('subscribe', () => {
    it('should create new subscription', async () => {
      schemaRepo.findOne.mockResolvedValue({ id: '1' });
      subRepo.findOne.mockResolvedValue(null);

      await service.subscribe('t1', {
        subscriberModule: 'M2',
        eventType: 'hrm.employee.created',
        namespace: 'hrm',
        handlerEndpoint: '/api/v1/finance/handlers/employee-created',
      });

      expect(subRepo.create).toHaveBeenCalled();
      expect(subRepo.save).toHaveBeenCalled();
    });

    it('should reject subscription to non-existent event', async () => {
      schemaRepo.findOne.mockResolvedValue(null);

      await expect(service.subscribe('t1', {
        subscriberModule: 'M2',
        eventType: 'non.existent.event',
        namespace: 'non',
        handlerEndpoint: '/handler',
      })).rejects.toThrow('not found');
    });
  });

  // --- Dead Letter Queue Tests ---

  describe('getDeadLetterEvents', () => {
    it('should return dead letter events', async () => {
      dlqRepo.find.mockResolvedValue([
        { id: '1', eventType: 'test.event', status: 'pending' },
      ]);

      const result = await service.getDeadLetterEvents('t1');
      expect(result).toHaveLength(1);
    });
  });

  describe('retryDeadLetter', () => {
    it('should retry dead letter event', async () => {
      dlqRepo.findOne.mockResolvedValue({
        id: '1', eventType: 'hrm.employee.created', namespace: 'hrm',
        publisherModule: 'M1', tenantId: 't1', payload: {},
        retryCount: 0, correlationId: 'corr-1',
      });
      schemaRepo.findOne.mockResolvedValue({
        namespace: 'hrm', ownerModule: 'M1', version: 1,
      });
      subRepo.find.mockResolvedValue([]);

      await service.retryDeadLetter('1');
      expect(dlqRepo.save).toHaveBeenCalledWith(expect.objectContaining({ retryCount: 1 }));
    });

    it('should abandon after max retries', async () => {
      dlqRepo.findOne.mockResolvedValue({
        id: '1', retryCount: 3, status: 'pending',
      });

      await expect(service.retryDeadLetter('1')).rejects.toThrow('Max retries');
    });
  });
});
