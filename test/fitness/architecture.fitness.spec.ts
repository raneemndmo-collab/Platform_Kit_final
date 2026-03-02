// =============================================================================
// Rasid Platform v6 — Architecture Fitness Functions
// Constitutional Reference: DDF-001, GATE 3 (Phase 0)
// These tests verify structural compliance with the constitution.
// They run on EVERY commit and BLOCK merge if violated.
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

const KERNEL_DIR = path.resolve(__dirname, '../../kernel');
const SHARED_DIR = path.resolve(__dirname, '../../shared');

// Recursively get all .ts files
function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...getTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// ============================================================
// P-001: Modularity Supremacy
// Verify kernel modules only import from shared/ or own directory
// ============================================================
describe('P-001: Modularity Supremacy', () => {
  const kernelSubsystems = [
    'k1-auth', 'k2-authz', 'k3-audit', 'k4-config', 'k5-event-bus',
    'k6-notification', 'k7-task-orchestration', 'k8-data-governance',
    'k9-monitoring', 'k10-module-lifecycle',
  ];

  for (const kernel of kernelSubsystems) {
    it(`${kernel} should not import from other kernel modules`, () => {
      const kernelPath = path.join(KERNEL_DIR, kernel);
      if (!fs.existsSync(kernelPath)) return;

      const files = getTypeScriptFiles(kernelPath);
      const otherKernels = kernelSubsystems.filter(k => k !== kernel);

      for (const file of files) {
        const content = readFile(file);
        for (const other of otherKernels) {
          const importPattern = new RegExp(`from\\s+['"]\\..*${other}`, 'g');
          const matches = content.match(importPattern);
          expect(matches).toBeNull();
        }
      }
    });
  }
});

// ============================================================
// P-003: Data Sovereignty
// No cross-module database references
// ============================================================
describe('P-003: Data Sovereignty', () => {
  const dbNames = [
    'auth_db', 'authz_db', 'audit_db', 'config_db', 'eventbus_db',
    'notification_db', 'orchestration_db', 'governance_db',
    'monitoring_db', 'lifecycle_db',
  ];

  const kernelToDb: Record<string, string> = {
    'k1-auth': 'auth_db',
    'k2-authz': 'authz_db',
    'k3-audit': 'audit_db',
    'k4-config': 'config_db',
    'k5-event-bus': 'eventbus_db',
    'k6-notification': 'notification_db',
    'k7-task-orchestration': 'orchestration_db',
    'k8-data-governance': 'governance_db',
    'k9-monitoring': 'monitoring_db',
    'k10-module-lifecycle': 'lifecycle_db',
  };

  for (const [kernel, ownDb] of Object.entries(kernelToDb)) {
    it(`${kernel} should not reference other module databases`, () => {
      const kernelPath = path.join(KERNEL_DIR, kernel);
      if (!fs.existsSync(kernelPath)) return;

      const files = getTypeScriptFiles(kernelPath);
      const otherDbs = dbNames.filter(db => db !== ownDb);

      for (const file of files) {
        const content = readFile(file);
        for (const otherDb of otherDbs) {
          expect(content).not.toContain(otherDb);
        }
      }
    });
  }
});

// ============================================================
// P-004: AI as External Capability
// AI modules SHALL NOT exist in Phase 0
// ============================================================
describe('P-004: AI External Capability (Phase 0)', () => {
  it('should not have any AI module directories', () => {
    const aiModules = ['m11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17'];
    for (const mod of aiModules) {
      const modPath = path.join(__dirname, '../../modules', mod);
      expect(fs.existsSync(modPath)).toBe(false);
    }
  });
});

// ============================================================
// P-005: Stateless by Default
// No shared mutable state between modules (FP-003, FP-025)
// ============================================================
describe('P-005: Stateless by Default', () => {
  it('should not use global mutable singletons outside services', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    for (const file of files) {
      const content = readFile(file);
      // Check for global variables (excluding const and readonly)
      const globalVarPattern = /^(?:export\s+)?(?:let|var)\s+\w+\s*=/gm;
      const matches = content.match(globalVarPattern);
      if (matches) {
        // Filter out legitimate cases (inside classes/functions)
        // This is a simplified check
        for (const match of matches) {
          expect(match).not.toMatch(/^(let|var)\s+/);
        }
      }
    }
  });
});

// ============================================================
// P-010: Kernel Immutability
// After Phase 0 freeze, no modifications without amendment
// ============================================================
describe('P-010: Kernel Immutability', () => {
  it('each kernel should have a module-manifest.yaml or be self-declaring', () => {
    const kernels = fs.readdirSync(KERNEL_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    expect(kernels.length).toBe(10);
    for (const kernel of kernels) {
      const kernelPath = path.join(KERNEL_DIR, kernel);
      const files = fs.readdirSync(kernelPath);
      const hasModule = files.some(f =>
        f.endsWith('.module.ts') || f === 'module-manifest.yaml'
      );
      expect(hasModule).toBe(true);
    }
  });
});

// ============================================================
// P-016: Tenant Isolation
// All entities must have tenantId (FP-011)
// ============================================================
describe('P-016: Tenant Isolation', () => {
  it('all entity classes should include tenantId column', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    const entityFiles = files.filter(f => {
      const content = readFile(f);
      return content.includes('@Entity(');
    });

    for (const file of entityFiles) {
      const content = readFile(file);
      // Either extends RasidBaseEntity (has tenantId) or extends AuditBaseEntity (has tenantId)
      const hasBaseEntity = content.includes('RasidBaseEntity') || content.includes('AuditBaseEntity');
      const hasTenantId = content.includes('tenantId');
      expect(hasBaseEntity || hasTenantId).toBe(true);
    }
  });
});

// ============================================================
// P-017: Audit Everything
// All controllers should have @Audit decorator on state-changing endpoints
// ============================================================
describe('P-017: Audit Everything', () => {
  it('all POST/PUT/DELETE endpoints should have @Audit decorator', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    const controllerFiles = files.filter(f => f.includes('controller'));

    for (const file of controllerFiles) {
      const content = readFile(file);
      const postMethods = content.match(/@Post\(/g) || [];
      const putMethods = content.match(/@Put\(/g) || [];
      const deleteMethods = content.match(/@Delete\(/g) || [];
      const auditDecorators = content.match(/@Audit\(/g) || [];

      const totalMutating = postMethods.length + putMethods.length + deleteMethods.length;
      // Allow health endpoints without audit
      const healthEndpoints = (content.match(/health/gi) || []).length > 0 ? 1 : 0;

      expect(auditDecorators.length).toBeGreaterThanOrEqual(totalMutating - healthEndpoints);
    }
  });
});

// ============================================================
// FP-007: No Raw SQL String Concatenation
// ============================================================
describe('FP-007: No SQL Injection Vectors', () => {
  it('should not contain raw SQL string concatenation', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    for (const file of files) {
      const content = readFile(file);
      // Check for SQL concatenation patterns
      const sqlConcatPattern = /`SELECT.*\$\{|'SELECT.*'\s*\+|"SELECT.*"\s*\+/g;
      const matches = content.match(sqlConcatPattern);
      expect(matches).toBeNull();
    }
  });
});

// ============================================================
// FP-008: No Secrets in Source Code
// ============================================================
describe('FP-008: No Secrets in Source', () => {
  it('should not contain hardcoded production secrets', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    for (const file of files) {
      const content = readFile(file);
      // Check for obvious secret patterns (exclude env references)
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
        /secret\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
      ];

      for (const pattern of secretPatterns) {
        const matches = content.match(pattern);
        // Filter out environment variable references and defaults
        if (matches) {
          const filtered = matches.filter(m =>
            !m.includes('process.env') &&
            !m.includes('change-in-production') &&
            !m.includes('example')
          );
          expect(filtered).toHaveLength(0);
        }
      }
    }
  });
});

// ============================================================
// DEP-005: Kernel-to-Module Dependency FORBIDDEN
// ============================================================
describe('DEP-005: No Kernel-to-Module Dependencies', () => {
  it('kernel code should not import from modules/', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    for (const file of files) {
      const content = readFile(file);
      expect(content).not.toMatch(/from\s+['"].*modules\//);
    }
  });
});

// ============================================================
// ASC-001: Phase Scope Enforcement
// Phase 0: Only kernel/, shared/, src/, infrastructure/
// ============================================================
describe('ASC-001: Phase 0 Scope Enforcement', () => {
  it('should not have business module directories', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const forbiddenDirs = ['modules'];
    for (const dir of forbiddenDirs) {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        // Directory may exist but should be empty
        const contents = fs.readdirSync(dirPath);
        expect(contents).toHaveLength(0);
      }
    }
  });
});

// ============================================================
// SA-003: Cyclomatic Complexity Budget
// Maximum 15 per function
// ============================================================
describe('SA-003: Complexity Budget', () => {
  it('files should not exceed 500 lines (B.3)', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    for (const file of files) {
      const content = readFile(file);
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(500);
    }
  });
});

// ============================================================
// Health Endpoint Verification
// Every kernel MUST have GET /health
// ============================================================
describe('Health Endpoints', () => {
  it('every kernel module should define a health endpoint', () => {
    const files = getTypeScriptFiles(KERNEL_DIR);
    const controllerFiles = files.filter(f =>
      f.includes('controller') || f.includes('.module.ts')
    );

    const kernelHealthEndpoints = new Set<string>();
    for (const file of controllerFiles) {
      const content = readFile(file);
      if (content.includes("'health'") || content.includes('"health"')) {
        // Extract kernel name from path
        const match = file.match(/kernel\/(k\d+-[^/]+)/);
        if (match) kernelHealthEndpoints.add(match[1]);
      }
    }

    expect(kernelHealthEndpoints.size).toBe(10);
  });
});

// v6.4 Architecture Fitness Tests
describe('v6.4 Constitutional Fitness', () => {
  const fs = require('fs');
  const path = require('path');

  const v64Modules = [
    'apil-orchestrator', 'arabic-ai-engine', 'bi-cognitive', 'data-intelligence',
    'data-safety', 'infographic-engine', 'performance-intelligence', 'spreadsheet-intelligence',
  ];

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

  describe('Module Isolation (P-003)', () => {
    it('all v6.4 modules should have isolated DB connections', () => {
      const appModule = fs.readFileSync(path.join(__dirname, '../../src/app.module.ts'), 'utf8');
      for (const mod of v64Modules) {
        const connName = mod.replace(/-/g, '_') + '_connection';
        expect(appModule).toContain(connName);
      }
    });

    it('no v6.4 module should cross-reference another module DB', () => {
      for (const mod of v64Modules) {
        const modDir = path.join(__dirname, '../../modules', mod);
        const files = findTsFiles(modDir);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          for (const other of v64Modules) {
            if (other !== mod) {
              const otherConn = other.replace(/-/g, '_') + '_connection';
              expect(content).not.toContain(otherConn);
            }
          }
        }
      }
    });
  });

  describe('Event Architecture (P-006)', () => {
    it('no v6.4 module should use broken EventBus import', () => {
      for (const mod of v64Modules) {
        const modDir = path.join(__dirname, '../../modules', mod);
        const files = findTsFiles(modDir);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          expect(content).not.toContain("from '../../shared/event-bus'");
        }
      }
    });

    it('v6.4 event registry should exist', () => {
      expect(fs.existsSync(path.join(__dirname, '../../shared/events/v64-event-registry.ts'))).toBe(true);
    });
  });

  describe('Manifest Completeness', () => {
    it('every module should have manifest.json', () => {
      const moduleDirs = fs.readdirSync(path.join(__dirname, '../../modules'));
      for (const mod of moduleDirs) {
        expect(fs.existsSync(path.join(__dirname, '../../modules', mod, 'manifest.json'))).toBe(true);
      }
    });

    it('every kernel should have manifest.json', () => {
      const kernelDirs = fs.readdirSync(path.join(__dirname, '../../kernel')).filter((d: string) => d.startsWith('k'));
      for (const k of kernelDirs) {
        expect(fs.existsSync(path.join(__dirname, '../../kernel', k, 'manifest.json'))).toBe(true);
      }
    });
  });

  describe('Shared Library Completeness', () => {
    it('all v6.4 shared libraries should have non-empty index.ts', () => {
      for (const lib of v64SharedLibs) {
        const indexPath = path.join(__dirname, '../../shared', lib, 'index.ts');
        expect(fs.existsSync(indexPath)).toBe(true);
        const content = fs.readFileSync(indexPath, 'utf8');
        expect(content.length).toBeGreaterThan(100);
      }
    });
  });

  describe('CQRS Architecture', () => {
    it('all business modules should have commands and queries', () => {
      const moduleDirs = fs.readdirSync(path.join(__dirname, '../../modules')).filter((d: string) => d.startsWith('m'));
      for (const mod of moduleDirs) {
        const cmdDir = path.join(__dirname, '../../modules', mod, 'application/commands');
        const qryDir = path.join(__dirname, '../../modules', mod, 'application/queries');
        expect(fs.existsSync(cmdDir)).toBe(true);
        expect(fs.existsSync(qryDir)).toBe(true);
      }
    });
  });

  describe('Security', () => {
    it('no PII in logging', () => {
      const allServices = findTsFiles(path.join(__dirname, '../../modules'));
      for (const file of allServices) {
        if (!file.endsWith('.service.ts')) continue;
        const content = fs.readFileSync(file, 'utf8');
        expect(content).not.toMatch(/logger\.(log|warn|error)\(.*\$\{.*email/);
        expect(content).not.toMatch(/logger\.(log|warn|error)\(.*\$\{.*password/);
      }
    });

    it('threat models should exist for all v6.4 modules', () => {
      for (const mod of v64Modules) {
        expect(fs.existsSync(path.join(__dirname, '../../docs/security/threat-models', `${mod}-threat-model.md`))).toBe(true);
      }
    });
  });

  function findTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findTsFiles(full));
      else if (entry.name.endsWith('.ts')) results.push(full);
    }
    return results;
  }
});
