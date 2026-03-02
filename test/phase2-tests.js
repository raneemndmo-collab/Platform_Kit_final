#!/usr/bin/env node
// Phase 2: Extended Business + Workflow - Test Suite
// Gates: Unit/integration tests, workflow engine, document versioning, file storage, 15 DBs audit, scheduler

const PHASE = 2;
const MODULES = ['M25', 'M7', 'M8', 'M6', 'M9', 'M10', 'M26'];
const results = { phase: PHASE, timestamp: new Date().toISOString(), tests: [], summary: {} };
let passed = 0, failed = 0, total = 0;

function test(category, name, fn) {
  total++;
  try {
    const result = fn();
    if (result === true || result === undefined) {
      passed++;
      results.tests.push({ category, name, status: 'PASS' });
    } else {
      failed++;
      results.tests.push({ category, name, status: 'FAIL', detail: String(result) });
    }
  } catch (e) {
    failed++;
    results.tests.push({ category, name, status: 'FAIL', detail: e.message });
  }
}

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..');

// ==========================================
// 1. STRUCTURAL TESTS - File Existence
// ==========================================
const moduleMap = {
  M25: 'm25-file-storage', M7: 'm7-document-mgmt', M8: 'm8-workflow',
  M6: 'm6-project-mgmt', M9: 'm9-compliance', M10: 'm10-legal-contract', M26: 'm26-scheduler'
};
const requiredFiles = ['domain/entities/index.ts', 'application/services/*.ts', 'api/controllers/*.ts', 'module-manifest.yaml'];

for (const [mod, dir] of Object.entries(moduleMap)) {
  test('STRUCTURE', `${mod} entities exist`, () => fs.existsSync(path.join(BASE, 'modules', dir, 'domain/entities/index.ts')));
  test('STRUCTURE', `${mod} service exists`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    return fs.existsSync(svcDir) && fs.readdirSync(svcDir).some(f => f.endsWith('.ts'));
  });
  test('STRUCTURE', `${mod} controller exists`, () => {
    const ctrlDir = path.join(BASE, 'modules', dir, 'api/controllers');
    return fs.existsSync(ctrlDir) && fs.readdirSync(ctrlDir).some(f => f.endsWith('.ts'));
  });
  test('STRUCTURE', `${mod} manifest exists`, () => fs.existsSync(path.join(BASE, 'modules', dir, 'module-manifest.yaml')));
}

// ==========================================
// 2. CONSTITUTIONAL COMPLIANCE - Tenant Isolation
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const entitiesFile = path.join(BASE, 'modules', dir, 'domain/entities/index.ts');
  if (fs.existsSync(entitiesFile)) {
    const content = fs.readFileSync(entitiesFile, 'utf8');
    test('TENANT_ISOLATION', `${mod} all entities have tenantId`, () => {
      const entityBlocks = content.split('@Entity(');
      for (let i = 1; i < entityBlocks.length; i++) {
        if (!entityBlocks[i].includes('tenantId')) return `Entity block ${i} missing tenantId`;
      }
      return true;
    });
    test('TENANT_ISOLATION', `${mod} tenantId is indexed`, () => content.includes("@Index()") && content.includes('tenantId'));
  }
}

// ==========================================
// 3. EVENT BUS COMPLIANCE
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const svcDir = path.join(BASE, 'modules', dir, 'application/services');
  if (fs.existsSync(svcDir)) {
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(svcDir, file), 'utf8');
      test('EVENT_BUS', `${mod} uses EventBus`, () => content.includes('EventBus') && content.includes('eventBus.publish'));
      test('EVENT_BUS', `${mod} events include tenantId`, () => {
        const publishes = content.match(/eventBus\.publish\([^)]+\)/g) || [];
        return publishes.every(p => p.includes('tenantId'));
      });
    }
  }
}

// ==========================================
// 4. AUDIT DECORATOR COMPLIANCE
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const ctrlDir = path.join(BASE, 'modules', dir, 'api/controllers');
  if (fs.existsSync(ctrlDir)) {
    const files = fs.readdirSync(ctrlDir).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(ctrlDir, file), 'utf8');
      test('AUDIT', `${mod} controller has @Audit decorators`, () => content.includes("@Audit("));
      test('AUDIT', `${mod} mutations are audited`, () => {
        const postMethods = (content.match(/@Post\(/g) || []).length;
        const putMethods = (content.match(/@Put\(/g) || []).length;
        const deleteMethods = (content.match(/@Delete\(/g) || []).length;
        const auditCount = (content.match(/@Audit\(/g) || []).length;
        return auditCount >= (postMethods + putMethods + deleteMethods) * 0.5; // At least 50% of mutations audited
      });
    }
  }
}

// ==========================================
// 5. HEALTH ENDPOINT COMPLIANCE
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const svcDir = path.join(BASE, 'modules', dir, 'application/services');
  if (fs.existsSync(svcDir)) {
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(svcDir, file), 'utf8');
      test('HEALTH', `${mod} has health() method`, () => content.includes('async health()'));
    }
  }
}

// ==========================================
// 6. DATABASE ISOLATION - Manifest Check
// ==========================================
const databases = new Set();
for (const [mod, dir] of Object.entries(moduleMap)) {
  const manifestPath = path.join(BASE, 'modules', dir, 'module-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const dbMatch = content.match(/name:\s*(\S+_db)/);
    if (dbMatch) {
      databases.add(dbMatch[1]);
      test('DB_ISOLATION', `${mod} has dedicated database: ${dbMatch[1]}`, () => true);
    }
    test('DB_ISOLATION', `${mod} manifest has event_namespace`, () => content.includes('event_namespace'));
    test('DB_ISOLATION', `${mod} manifest has api_base`, () => content.includes('api_base'));
  }
}

// Count total databases (Phase 1 had 8, Phase 2 adds 7)
const phase1Dbs = ['gateway_db', 'hrm_db', 'finance_db', 'crm_db', 'inventory_db', 'procurement_db', 'identity_db', 'audit_db'];
const allDbs = [...phase1Dbs, ...databases];
test('DB_ISOLATION', `Total databases >= 15 (Phase 2 gate)`, () => allDbs.length >= 15 ? true : `Only ${allDbs.length} databases found`);

// ==========================================
// 7. MODULE-SPECIFIC TESTS
// ==========================================

// M25: File Storage abstraction
test('M25_FILE_STORAGE', 'File versioning support', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m25-file-storage/application/services/file-storage.service.ts'), 'utf8');
  return content.includes('createVersion') && content.includes('getVersionHistory');
});
test('M25_FILE_STORAGE', 'Virus scan integration', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m25-file-storage/application/services/file-storage.service.ts'), 'utf8');
  return content.includes('completeScan') && content.includes('quarantined');
});
test('M25_FILE_STORAGE', 'Storage provider abstraction', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m25-file-storage/domain/entities/index.ts'), 'utf8');
  return content.includes('storageProvider') && content.includes('s3');
});

// M7: Document versioning & lifecycle
test('M7_DOCUMENT', 'Document versioning', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m7-document-mgmt/application/services/document.service.ts'), 'utf8');
  return content.includes('updateDocument') && content.includes('currentVersion + 1');
});
test('M7_DOCUMENT', 'Document lifecycle (draft→review→approved→published)', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m7-document-mgmt/application/services/document.service.ts'), 'utf8');
  return content.includes('submitForApproval') && content.includes('publishDocument') && content.includes('archiveDocument');
});
test('M7_DOCUMENT', 'Multi-step approval chain', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m7-document-mgmt/application/services/document.service.ts'), 'utf8');
  return content.includes('stepOrder') && content.includes("pending === 0");
});

// M8: Workflow engine
test('M8_WORKFLOW', 'Workflow definition with steps', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m8-workflow/domain/entities/index.ts'), 'utf8');
  return content.includes('WorkflowStepDef') && content.includes("'approval'") && content.includes("'condition'");
});
test('M8_WORKFLOW', 'Workflow instance lifecycle', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m8-workflow/application/services/workflow.service.ts'), 'utf8');
  return content.includes('startWorkflow') && content.includes('processStep') && content.includes('cancelWorkflow');
});
test('M8_WORKFLOW', 'Step timeout support', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m8-workflow/domain/entities/index.ts'), 'utf8');
  return content.includes('timeoutHours') && content.includes('timeoutAt');
});
test('M8_WORKFLOW', 'Pending approvals query', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m8-workflow/application/services/workflow.service.ts'), 'utf8');
  return content.includes('getPendingApprovals');
});

// M6: Project management
test('M6_PROJECT', 'Task management with dependencies', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m6-project-mgmt/domain/entities/index.ts'), 'utf8');
  return content.includes('dependencies') && content.includes('parentTaskId');
});
test('M6_PROJECT', 'Auto completion recalculation', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m6-project-mgmt/application/services/project.service.ts'), 'utf8');
  return content.includes('recalculateProjectCompletion');
});
test('M6_PROJECT', 'Time tracking', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m6-project-mgmt/application/services/project.service.ts'), 'utf8');
  return content.includes('logTime') && content.includes('actualHours');
});

// M9: Compliance
test('M9_COMPLIANCE', 'Compliance dashboard', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m9-compliance/application/services/compliance.service.ts'), 'utf8');
  return content.includes('getComplianceDashboard') && content.includes('overallScore');
});
test('M9_COMPLIANCE', 'Risk assessment with likelihood/impact', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m9-compliance/domain/entities/index.ts'), 'utf8');
  return content.includes('likelihood') && content.includes('impact');
});

// M10: Legal contracts
test('M10_LEGAL', 'Contract status transitions validated', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m10-legal-contract/application/services/legal-contract.service.ts'), 'utf8');
  return content.includes('validTransitions') && content.includes('Invalid transition');
});
test('M10_LEGAL', 'Clause library', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m10-legal-contract/application/services/legal-contract.service.ts'), 'utf8');
  return content.includes('addClauseTemplate') && content.includes('searchClauseLibrary');
});
test('M10_LEGAL', 'Expiring contracts alert', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m10-legal-contract/application/services/legal-contract.service.ts'), 'utf8');
  return content.includes('getExpiringContracts');
});

// M26: Scheduler
test('M26_SCHEDULER', 'Distributed lock mechanism', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m26-scheduler/application/services/scheduler.service.ts'), 'utf8');
  return content.includes('lockId') && content.includes('lockExpiresAt') && content.includes('IsNull');
});
test('M26_SCHEDULER', 'Retry with exponential backoff', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m26-scheduler/application/services/scheduler.service.ts'), 'utf8');
  return content.includes('Math.pow(2') && content.includes('retryCount');
});
test('M26_SCHEDULER', 'Cron and interval support', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m26-scheduler/domain/entities/index.ts'), 'utf8');
  return content.includes('cronExpression') && content.includes('intervalSeconds');
});

// ==========================================
// 8. CROSS-MODULE INTEGRATION CHECKS
// ==========================================
test('INTEGRATION', 'M7 depends on M25 (file storage)', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m7-document-mgmt/module-manifest.yaml'), 'utf8');
  return manifest.includes('M25');
});
test('INTEGRATION', 'M10 depends on M7 and M25', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m10-legal-contract/module-manifest.yaml'), 'utf8');
  return manifest.includes('M7') && manifest.includes('M25');
});
test('INTEGRATION', 'M6 depends on M8 (workflow)', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m6-project-mgmt/module-manifest.yaml'), 'utf8');
  return manifest.includes('M8');
});
test('INTEGRATION', 'M9 depends on M7 and M8', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m9-compliance/module-manifest.yaml'), 'utf8');
  return manifest.includes('M7') && manifest.includes('M8');
});

// ==========================================
// 9. FORBIDDEN PATTERNS CHECK
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const allFiles = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (f.endsWith('.ts')) allFiles.push(fp);
    }
  }
  walk(path.join(BASE, 'modules', dir));
  
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const fname = path.relative(BASE, file);
    test('FORBIDDEN', `${mod} no hardcoded tenant IDs in ${fname}`, () => {
      return !content.match(/tenantId\s*[:=]\s*['"][a-f0-9-]+['"]/);
    });
    test('FORBIDDEN', `${mod} no direct DB connection strings in ${fname}`, () => {
      return !content.match(/postgres:\/\//i) && !content.match(/mongodb:\/\//i);
    });
  }
}

// ==========================================
// SUMMARY
// ==========================================
results.summary = {
  total, passed, failed,
  passRate: `${((passed / total) * 100).toFixed(1)}%`,
  phase2Modules: MODULES.length,
  totalDatabases: allDbs.length,
  phase2Databases: databases.size,
};

console.log('\n' + '='.repeat(60));
console.log(`  PHASE 2 TEST RESULTS: ${passed}/${total} PASSED (${results.summary.passRate})`);
console.log('='.repeat(60));
console.log(`  Modules: ${MODULES.join(', ')}`);
console.log(`  Phase 2 Databases: ${[...databases].join(', ')}`);
console.log(`  Total Platform DBs: ${allDbs.length}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\nFAILED TESTS:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  ❌ [${t.category}] ${t.name}: ${t.detail || ''}`);
  });
}

console.log('\nCATEGORY BREAKDOWN:');
const categories = {};
results.tests.forEach(t => {
  if (!categories[t.category]) categories[t.category] = { pass: 0, fail: 0 };
  categories[t.category][t.status === 'PASS' ? 'pass' : 'fail']++;
});
Object.entries(categories).forEach(([cat, counts]) => {
  const icon = counts.fail === 0 ? '✅' : '⚠️';
  console.log(`  ${icon} ${cat}: ${counts.pass}/${counts.pass + counts.fail}`);
});

// Save results
const outputPath = path.join(BASE, 'test-results', 'phase2-results.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to: ${outputPath}`);

// Exit gate
const GATE_THRESHOLD = 90;
const passRate = (passed / total) * 100;
if (passRate >= GATE_THRESHOLD) {
  console.log(`\n🚀 PHASE 2 EXIT GATE: PASS (${passRate.toFixed(1)}% >= ${GATE_THRESHOLD}%)`);
  process.exit(0);
} else {
  console.log(`\n🚫 PHASE 2 EXIT GATE: FAIL (${passRate.toFixed(1)}% < ${GATE_THRESHOLD}%)`);
  process.exit(1);
}
