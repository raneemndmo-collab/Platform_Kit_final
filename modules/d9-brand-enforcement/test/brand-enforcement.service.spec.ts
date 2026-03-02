// ═══════════════════════════════════════════════════════════════════════
// D9: Brand Enforcement Engine — Unit Tests | Phase 7 Tier X
// ═══════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BrandEnforcementEngineService } from '../application/services/brand-enforcement.service';
import { BrandPack, ComplianceReport } from '../domain/entities';

const mockRepo = () => ({
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((e) => Promise.resolve({ id: e.id || 'test-id', ...e })),
  findOne: jest.fn(() => Promise.resolve({ id: 'test-id', tenantId: 'tenant-1' })),
  findOneOrFail: jest.fn(() => Promise.resolve({ id: 'test-id', tenantId: 'tenant-1' })),
  find: jest.fn(() => Promise.resolve([])),
  update: jest.fn(), delete: jest.fn(), count: jest.fn(() => Promise.resolve(0)),
  query: jest.fn(() => Promise.resolve([])),
});

const mockEventBus = { publish: jest.fn(() => Promise.resolve()) };

describe('BrandEnforcementEngineService', () => {
  let service: BrandEnforcementEngineService;
  let brandPackRepo: ReturnType<typeof mockRepo>;
  let complianceReportRepo: ReturnType<typeof mockRepo>;
  let eventBus: typeof mockEventBus;

  beforeEach(async () => {
    brandPackRepo = mockRepo();
    complianceReportRepo = mockRepo();
    eventBus = { publish: jest.fn(() => Promise.resolve()) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandEnforcementEngineService,
        { provide: getRepositoryToken(BrandPack), useValue: brandPackRepo },
        { provide: getRepositoryToken(ComplianceReport), useValue: complianceReportRepo },
        { provide: 'EventBus', useValue: eventBus },
      ],
    }).compile();
    service = module.get<BrandEnforcementEngineService>(BrandEnforcementEngineService);
    (service as any).eventBus = eventBus;
  });

  describe('createBrandPack', () => {
    it('should create with tenant isolation (TXD-001, P-016)', async () => {
      const result = await service.createBrandPack('tenant-1', { name: 'Test' });
      expect(result).toBeDefined();
      expect(brandPackRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
    });
    it('should emit brand.* event (ESR-003)', async () => {
      await service.createBrandPack('tenant-1', { name: 'Test' });
      expect(eventBus.publish).toHaveBeenCalledWith(expect.stringContaining('brand.'), expect.any(Object));
    });
  });

  describe('health', () => {
    it('should return healthy with DPC cluster info', async () => {
      brandPackRepo.query = jest.fn().mockResolvedValue([]);
      const result = await service.health();
      expect(result.status).toBe('healthy');
      expect(result.cluster).toBe('DPC');
    });
  });

  describe('Constitutional Compliance (Tier X)', () => {
    it('entities have tenantId (P-016)', () => {
      const ent = require('fs').readFileSync(require('path').join(__dirname, '..', 'domain', 'entities', 'index.ts'), 'utf8');
      expect(ent).toContain('tenantId');
    });
    it('no business DB access (TXD-005)', () => {
      const svc = require('fs').readFileSync(require('path').join(__dirname, '..', 'application', 'services', 'brand-enforcement.service.ts'), 'utf8');
      expect(svc).not.toMatch(/hrm_db|finance_db|crm_db|inventory_db/);
    });
    it('no cross-module imports (SA-001)', () => {
      const svc = require('fs').readFileSync(require('path').join(__dirname, '..', 'application', 'services', 'brand-enforcement.service.ts'), 'utf8');
      expect(svc.match(/from\s+['"].*modules\/[md]\d/g) || []).toHaveLength(0);
    });
    it('event namespace uses brand.* (ESR-003)', () => {
      const svc = require('fs').readFileSync(require('path').join(__dirname, '..', 'application', 'services', 'brand-enforcement.service.ts'), 'utf8');
      expect(svc).toContain("'brand.");
    });
    it('API path is /api/v1/brand (API-004)', () => {
      const ctrl = require('fs').readdirSync(require('path').join(__dirname, '..', 'api', 'controllers')).filter(f => f.endsWith('.ts'));
      const c = require('fs').readFileSync(require('path').join(__dirname, '..', 'api', 'controllers', ctrl[0]), 'utf8');
      expect(c).toContain('api/v1/');
    });
    it('manifest declares D9 on DPC cluster', () => {
      const m = require('fs').readFileSync(require('path').join(__dirname, '..', 'module-manifest.yaml'), 'utf8');
      expect(m).toContain('D9');
      expect(m).toContain('DPC');
    });
  });
});
