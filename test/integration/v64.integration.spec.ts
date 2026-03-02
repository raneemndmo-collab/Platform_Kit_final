// Rasid v6.4 — Integration Tests
import { Test } from '@nestjs/testing';

describe('Rasid v6.4 Integration Tests', () => {
  // Module existence tests
  const v64Modules = [
    'apil-orchestrator', 'arabic-ai-engine', 'bi-cognitive', 'data-intelligence',
    'data-safety', 'infographic-engine', 'performance-intelligence', 'spreadsheet-intelligence',
  ];

  describe('Module Structure Verification', () => {
    for (const mod of v64Modules) {
      it(`${mod} should have complete structure`, () => {
        const fs = require('fs');
        const basePath = `${__dirname}/../../modules/${mod}`;
        expect(fs.existsSync(`${basePath}/manifest.json`)).toBe(true);
        expect(fs.existsSync(`${basePath}/domain/entities`)).toBe(true);
        expect(fs.existsSync(`${basePath}/application/services`)).toBe(true);
        expect(fs.existsSync(`${basePath}/application/commands`)).toBe(true);
        expect(fs.existsSync(`${basePath}/application/queries`)).toBe(true);
        expect(fs.existsSync(`${basePath}/infrastructure/repositories`)).toBe(true);
        expect(fs.existsSync(`${basePath}/test`)).toBe(true);
      });
    }
  });

  describe('Shared Library Verification', () => {
    const v64SharedLibs = [
      'mcge', 'triple-verification', 'layout-archetype', 'confidence-scoring',
      'visual-pipeline', 'execution-snapshot', 'parallel-dag', 'adaptive-aggregation',
      'columnar-cache', 'density-sampling', 'script-layout', 'hierarchy-parity',
      'design-stability', 'narrative-coherence', 'cognitive-load', 'smart-auto',
      'learning-profile', 'dual-interface', 'guided-reconstruction', 'resource-reservation',
      'sovereign-offline', 'insight-engine', 'formula-inference', 'pivot-reconstructor',
      'query-optimizer', 'data-quality', 'visual-stability', 'mixed-script',
      'balance-correction', 'workload-prediction',
    ];

    for (const lib of v64SharedLibs) {
      it(`shared/${lib} should have index.ts`, () => {
        const fs = require('fs');
        expect(fs.existsSync(`${__dirname}/../../shared/${lib}/index.ts`)).toBe(true);
      });
    }
  });

  describe('Constitutional Compliance', () => {
    it('should have v6.4 event registry', () => {
      const fs = require('fs');
      expect(fs.existsSync(`${__dirname}/../../shared/events/v64-event-registry.ts`)).toBe(true);
    });

    it('v6.4 modules should have isolated DB connections in app.module', () => {
      const fs = require('fs');
      const appModule = fs.readFileSync(`${__dirname}/../../src/app.module.ts`, 'utf8');
      expect(appModule).toContain('apil_orchestrator_connection');
      expect(appModule).toContain('arabic_ai_engine_connection');
      expect(appModule).toContain('bi_cognitive_connection');
      expect(appModule).toContain('data_intelligence_connection');
      expect(appModule).toContain('data_safety_connection');
      expect(appModule).toContain('infographic_engine_connection');
      expect(appModule).toContain('performance_intelligence_connection');
      expect(appModule).toContain('spreadsheet_intelligence_connection');
    });

    it('all v6.4 modules should use EventEmitter2 not EventBus', () => {
      const fs = require('fs');
      const glob = require('path');
      for (const mod of v64Modules) {
        const services = fs.readdirSync(`${__dirname}/../../modules/${mod}/application/services`).filter((f: string) => f.endsWith('.service.ts'));
        for (const svc of services) {
          const content = fs.readFileSync(`${__dirname}/../../modules/${mod}/application/services/${svc}`, 'utf8');
          expect(content).not.toContain("from '../../shared/event-bus'");
        }
      }
    });

    it('v6.4 DB init SQL should exist', () => {
      const fs = require('fs');
      const sql = fs.readFileSync(`${__dirname}/../../infrastructure/docker/init-all-dbs.sql`, 'utf8');
      expect(sql).toContain('apil_orchestrator_db');
      expect(sql).toContain('spreadsheet_intelligence_db');
    });
  });

  describe('Data Sovereignty (P-003)', () => {
    it('each v6.4 module should have its own DB connection name', () => {
      const fs = require('fs');
      for (const mod of v64Modules) {
        const modName = mod.replace(/-/g, '_');
        const repoDir = `${__dirname}/../../modules/${mod}/infrastructure/repositories`;
        if (fs.existsSync(repoDir)) {
          const repos = fs.readdirSync(repoDir).filter((f: string) => f.endsWith('.repository.ts'));
          for (const repo of repos) {
            const content = fs.readFileSync(`${repoDir}/${repo}`, 'utf8');
            expect(content).toContain(`${modName}_connection`);
          }
        }
      }
    });
  });
});
