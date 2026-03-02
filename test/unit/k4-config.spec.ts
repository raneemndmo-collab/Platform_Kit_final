// =============================================================================
// K4: Configuration — Unit Tests
// GATE 1: >90% coverage for kernel subsystems
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { K4ConfigService } from '../../kernel/k4-config/application/handlers/config.service';
import {
  ConfigurationEntity, FeatureFlagEntity, EnvironmentProfileEntity,
} from '../../kernel/k4-config/domain/entities';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto: any) => ({ ...dto, id: 'test-id' })),
  save: jest.fn((entity: any) => Promise.resolve({ ...entity, id: entity.id || 'test-id' })),
  delete: jest.fn(),
});

describe('K4ConfigService', () => {
  let service: K4ConfigService;
  let configRepo: any;
  let flagRepo: any;
  let envRepo: any;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K4ConfigService,
        { provide: getRepositoryToken(ConfigurationEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(FeatureFlagEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(EnvironmentProfileEntity), useFactory: mockRepo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(K4ConfigService);
    configRepo = module.get(getRepositoryToken(ConfigurationEntity));
    flagRepo = module.get(getRepositoryToken(FeatureFlagEntity));
    envRepo = module.get(getRepositoryToken(EnvironmentProfileEntity));
    eventEmitter = module.get(EventEmitter2);
  });

  // --- Configuration Tests ---

  describe('getConfig', () => {
    it('should return config by module/key/environment', async () => {
      const config = { id: '1', moduleId: 'K1', key: 'timeout', value: '30', tenantId: 't1' };
      configRepo.findOne.mockResolvedValue(config);

      const result = await service.getConfig('t1', 'K1', 'timeout', 'production');
      expect(result).toEqual(config);
      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: { tenantId: 't1', moduleId: 'K1', key: 'timeout', environment: 'production' },
      });
    });

    it('should return null for non-existent config', async () => {
      configRepo.findOne.mockResolvedValue(null);
      const result = await service.getConfig('t1', 'K1', 'missing');
      expect(result).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('should create new config when not exists', async () => {
      configRepo.findOne.mockResolvedValue(null);

      const dto = { moduleId: 'K1', key: 'timeout', value: '30' };
      await service.setConfig('t1', 'user1', dto);

      expect(configRepo.create).toHaveBeenCalled();
      expect(configRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'config.value.changed',
        expect.objectContaining({ moduleId: 'K1', key: 'timeout' }),
      );
    });

    it('should update existing config', async () => {
      const existing = { id: '1', value: '20', tenantId: 't1', moduleId: 'K1', key: 'timeout' };
      configRepo.findOne.mockResolvedValue(existing);

      const dto = { moduleId: 'K1', key: 'timeout', value: '30' };
      await service.setConfig('t1', 'user1', dto);

      expect(configRepo.save).toHaveBeenCalledWith(expect.objectContaining({ value: '30' }));
    });
  });

  describe('getModuleConfigs', () => {
    it('should return all configs for a module', async () => {
      const configs = [
        { moduleId: 'K1', key: 'timeout', value: '30' },
        { moduleId: 'K1', key: 'retries', value: '3' },
      ];
      configRepo.find.mockResolvedValue(configs);

      const result = await service.getModuleConfigs('t1', 'K1');
      expect(result).toHaveLength(2);
    });
  });

  describe('deleteConfig', () => {
    it('should delete existing config', async () => {
      configRepo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.deleteConfig('t1', 'K1', 'timeout')).resolves.not.toThrow();
    });

    it('should throw NotFoundException for missing config', async () => {
      configRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.deleteConfig('t1', 'K1', 'missing')).rejects.toThrow('not found');
    });
  });

  // --- Feature Flag Tests ---

  describe('isFeatureEnabled', () => {
    it('should return false when flag does not exist', async () => {
      flagRepo.findOne.mockResolvedValue(null);
      const result = await service.isFeatureEnabled('t1', 'new_ui');
      expect(result).toBe(false);
    });

    it('should return flag enabled status', async () => {
      flagRepo.findOne.mockResolvedValue({
        enabled: true, tenantOverrides: {}, rolloutPercentage: 0,
      });
      const result = await service.isFeatureEnabled('t1', 'new_ui');
      expect(result).toBe(true);
    });

    it('should respect tenant-specific overrides', async () => {
      flagRepo.findOne.mockResolvedValue({
        enabled: true, tenantOverrides: { 't1': false }, rolloutPercentage: 0,
      });
      const result = await service.isFeatureEnabled('t1', 'new_ui');
      expect(result).toBe(false);
    });
  });

  describe('createFeatureFlag', () => {
    it('should create a new feature flag', async () => {
      flagRepo.findOne.mockResolvedValue(null);
      const dto = { name: 'new_ui', moduleId: 'K1' };
      await service.createFeatureFlag('t1', 'user1', dto);
      expect(flagRepo.create).toHaveBeenCalled();
      expect(flagRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when flag exists', async () => {
      flagRepo.findOne.mockResolvedValue({ name: 'new_ui' });
      await expect(
        service.createFeatureFlag('t1', 'user1', { name: 'new_ui', moduleId: 'K1' }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('toggleFeatureFlag', () => {
    it('should toggle existing flag', async () => {
      flagRepo.findOne.mockResolvedValue({ name: 'new_ui', enabled: false });
      await service.toggleFeatureFlag('t1', 'user1', 'new_ui', { enabled: true });
      expect(flagRepo.save).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
      expect(eventEmitter.emit).toHaveBeenCalledWith('config.feature.toggled', expect.anything());
    });

    it('should throw NotFoundException for missing flag', async () => {
      flagRepo.findOne.mockResolvedValue(null);
      await expect(
        service.toggleFeatureFlag('t1', 'user1', 'missing', { enabled: true }),
      ).rejects.toThrow('not found');
    });
  });
});
