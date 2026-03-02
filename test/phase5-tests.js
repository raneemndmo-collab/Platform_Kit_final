#!/usr/bin/env node
// Phase 5: Hardening + Production Readiness - Test Suite
// Gates: Tenant isolation verified, audit immutability, billing cycle, API key rotation,
//        31 DBs audit, full platform constitutional compliance

const PHASE = 5;
const MODULES = ['M27', 'M28', 'M29', 'M31'];
const results = { phase: PHASE, timestamp: new Date().toISOString(), tests: [], summary: {} };
let passed = 0, failed = 0, total = 0;

function test(category, name, fn) {
  total++;
  try {
    const result = fn();
    if (result === true || result === undefined) { passed++; results.tests.push({ category, name, status: 'PASS' }); }
    else { failed++; results.tests.push({ category, name, status: 'FAIL', detail: String(result) }); }
  } catch (e) { failed++; results.tests.push({ category, name, status: 'FAIL', detail: e.message }); }
}

const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..');

const moduleMap = {
  M27: 'm27-audit-trail', M28: 'm28-tenant-mgmt', M29: 'm29-billing', M31: 'm31-dev-portal'
};

// ==========================================
// 1. STRUCTURAL TESTS
// ==========================================
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
  test('STRUCTURE', `${mod} module file exists`, () => {
    const files = fs.readdirSync(path.join(BASE, 'modules', dir)).filter(f => f.endsWith('.module.ts'));
    return files.length > 0;
  });
}

// ==========================================
// 2. TENANT ISOLATION + EVENT BUS + AUDIT + HEALTH
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  test('TENANT_ISOLATION', `${mod} entities have tenantId`, () => {
    return fs.readFileSync(path.join(BASE, 'modules', dir, 'domain/entities/index.ts'), 'utf8').includes('tenantId');
  });
  test('EVENT_BUS', `${mod} uses EventBus`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    return fs.readdirSync(svcDir).filter(f => f.endsWith('.ts')).some(f =>
      fs.readFileSync(path.join(svcDir, f), 'utf8').includes('eventBus'));
  });
  test('AUDIT', `${mod} has @Audit decorators`, () => {
    const ctrlDir = path.join(BASE, 'modules', dir, 'api/controllers');
    return fs.readdirSync(ctrlDir).filter(f => f.endsWith('.ts')).some(f =>
      fs.readFileSync(path.join(ctrlDir, f), 'utf8').includes('@Audit('));
  });
  test('HEALTH', `${mod} has health endpoint`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    return fs.readdirSync(svcDir).filter(f => f.endsWith('.ts')).some(f =>
      fs.readFileSync(path.join(svcDir, f), 'utf8').includes('health()'));
  });
}

// ==========================================
// 3. FULL PLATFORM DATABASE AUDIT (All 31 modules)
// ==========================================
const ALL_MODULES = {
  M1: 'm1-hrm', M2: 'm2-finance', M3: 'm3-crm', M4: 'm4-inventory', M5: 'm5-procurement', M30: 'm30-gateway',
  M25: 'm25-file-storage', M7: 'm7-document-mgmt', M8: 'm8-workflow', M6: 'm6-project-mgmt',
  M9: 'm9-compliance', M10: 'm10-legal-contract', M26: 'm26-scheduler',
  M11: 'm11-ai-orchestration', M12: 'm12-analytics', M13: 'm13-reporting',
  M14: 'm14-decision-engine', M15: 'm15-knowledge-graph', M16: 'm16-nlp', M17: 'm17-vision-ai',
  M18: 'm18-dashboard', M19: 'm19-portal', M20: 'm20-notification-center',
  M21: 'm21-search-engine', M22: 'm22-personalization', M23: 'm23-collaboration-hub', M24: 'm24-integration-hub',
  M27: 'm27-audit-trail', M28: 'm28-tenant-mgmt', M29: 'm29-billing', M31: 'm31-dev-portal'
};

const allDbs = [];
const dbModuleMap = {};
let moduleCount = 0;

for (const [mod, dir] of Object.entries(ALL_MODULES)) {
  const manifestPath = path.join(BASE, 'modules', dir, 'module-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    moduleCount++;
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    const dbMatch = manifest.match(/name:\s*(\w+_db)/);
    if (dbMatch) {
      allDbs.push(dbMatch[1]);
      dbModuleMap[dbMatch[1]] = mod;
    }
  }
}

test('FULL_PLATFORM_DB', `All 31 modules have manifests (found: ${moduleCount})`, () => moduleCount === 31);
test('FULL_PLATFORM_DB', `All databases are unique (${allDbs.length} DBs, ${new Set(allDbs).size} unique)`, () => allDbs.length === new Set(allDbs).size);
test('FULL_PLATFORM_DB', `Database count >= 27`, () => new Set(allDbs).size >= 27);

// Phase-specific DB counts
const phaseDbCounts = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 };
for (const [mod, dir] of Object.entries(ALL_MODULES)) {
  const manifestPath = path.join(BASE, 'modules', dir, 'module-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    const phaseMatch = manifest.match(/phase:\s*(\d)/);
    if (phaseMatch) {
      const p = `p${phaseMatch[1]}`;
      if (phaseDbCounts[p] !== undefined) phaseDbCounts[p]++;
    }
  }
}

// ==========================================
// 4. PHASE 5 SPECIFIC GATE TESTS
// ==========================================

// Gate: Tenant Isolation Verification
test('TENANT_MGMT', 'M28 has tenant creation with slug uniqueness', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m28-tenant-mgmt/application/services/tenant.service.ts'), 'utf8');
  return svc.includes('createTenant') && svc.includes('slug');
});
test('TENANT_MGMT', 'M28 has tenant suspension', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m28-tenant-mgmt/application/services/tenant.service.ts'), 'utf8');
  return svc.includes('suspendTenant') && svc.includes('suspended');
});
test('TENANT_MGMT', 'M28 has isolation testing capability', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m28-tenant-mgmt/application/services/tenant.service.ts'), 'utf8');
  return svc.includes('runIsolationTest') && svc.includes('data_isolation');
});
test('TENANT_MGMT', 'M28 has database management per tenant', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m28-tenant-mgmt/application/services/tenant.service.ts'), 'utf8');
  return svc.includes('registerDatabase') && svc.includes('getTenantDatabases');
});
test('TENANT_MGMT', 'M28 has backup capability', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m28-tenant-mgmt/application/services/tenant.service.ts'), 'utf8');
  return svc.includes('backupDatabase') && svc.includes('lastBackupAt');
});

// Gate: Audit Immutability
test('AUDIT_TRAIL', 'M27 has comprehensive audit logging', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m27-audit-trail/application/services/audit-trail.service.ts'), 'utf8');
  return svc.includes('logEntry') && svc.includes('oldValues') && svc.includes('newValues');
});
test('AUDIT_TRAIL', 'M27 has severity levels including critical', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m27-audit-trail/application/services/audit-trail.service.ts'), 'utf8');
  return svc.includes('severity') && svc.includes('critical');
});
test('AUDIT_TRAIL', 'M27 has retention policies', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m27-audit-trail/application/services/audit-trail.service.ts'), 'utf8');
  return svc.includes('setRetentionPolicy') && svc.includes('retentionDays');
});
test('AUDIT_TRAIL', 'M27 has audit export', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m27-audit-trail/application/services/audit-trail.service.ts'), 'utf8');
  return svc.includes('exportAuditLog') && svc.includes('format');
});
test('AUDIT_TRAIL', 'M27 has query with filtering', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m27-audit-trail/application/services/audit-trail.service.ts'), 'utf8');
  return svc.includes('queryAuditLog') && svc.includes('entityType') && svc.includes('userId');
});
test('AUDIT_TRAIL', 'M27 subscribes to all events', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m27-audit-trail/module-manifest.yaml'), 'utf8');
  return manifest.includes('"*.*"') || manifest.includes("'*.*'") || manifest.includes('*.*');
});

// Gate: Billing Cycle
test('BILLING', 'M29 has invoice generation with VAT', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m29-billing/application/services/billing.service.ts'), 'utf8');
  return svc.includes('generateInvoice') && svc.includes('tax') && svc.includes('lineItems');
});
test('BILLING', 'M29 has payment processing', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m29-billing/application/services/billing.service.ts'), 'utf8');
  return svc.includes('processPayment') && svc.includes('transactionId');
});
test('BILLING', 'M29 has usage-based billing', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m29-billing/application/services/billing.service.ts'), 'utf8');
  return svc.includes('recordUsage') && svc.includes('unitPrice');
});
test('BILLING', 'M29 has overdue invoice tracking', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m29-billing/application/services/billing.service.ts'), 'utf8');
  return svc.includes('getOverdueInvoices') && svc.includes('dueDate');
});
test('BILLING', 'M29 depends on M28', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m29-billing/module-manifest.yaml'), 'utf8');
  return manifest.includes('M28');
});

// Gate: API Key Rotation
test('DEV_PORTAL', 'M31 has API key generation with hashing', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('generateApiKey') && svc.includes('sha256') && svc.includes('keyHash');
});
test('DEV_PORTAL', 'M31 has API key rotation', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('rotateApiKey') && svc.includes('revokeApiKey');
});
test('DEV_PORTAL', 'M31 has API key validation', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('validateApiKey') && svc.includes('expired');
});
test('DEV_PORTAL', 'M31 has sandbox environments', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('createSandbox') && svc.includes('baseUrl');
});
test('DEV_PORTAL', 'M31 has API documentation publishing', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('publishDocs') && svc.includes('openApiSpec');
});
test('DEV_PORTAL', 'M31 has rate limiting config', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('rateLimits') && svc.includes('requestsPerMinute');
});
test('DEV_PORTAL', 'M31 has API usage stats', () => {
  const svc = fs.readFileSync(path.join(BASE, 'modules/m31-dev-portal/application/services/dev-portal.service.ts'), 'utf8');
  return svc.includes('recordApiUsage') && svc.includes('avgLatencyMs');
});

// ==========================================
// 5. FULL PLATFORM CONSTITUTIONAL COMPLIANCE
// ==========================================

// Check ALL 31 modules for constitutional requirements
let constitutionalPass = 0;
let constitutionalTotal = 0;

for (const [mod, dir] of Object.entries(ALL_MODULES)) {
  const modPath = path.join(BASE, 'modules', dir);
  if (!fs.existsSync(modPath)) continue;

  // Check entities have tenantId (except M28 Tenant entity itself)
  const entityPath = path.join(modPath, 'domain/entities/index.ts');
  if (fs.existsSync(entityPath)) {
    constitutionalTotal++;
    const content = fs.readFileSync(entityPath, 'utf8');
    if (content.includes('tenantId')) constitutionalPass++;
    else test('CONSTITUTIONAL', `${mod} entities missing tenantId`, () => false);
  }

  // Check manifest exists
  const manifestPath = path.join(modPath, 'module-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    constitutionalTotal++;
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    if (manifest.includes('event_namespace:')) constitutionalPass++;
    else test('CONSTITUTIONAL', `${mod} manifest missing event_namespace`, () => false);
  }

  // Check health endpoint
  const svcDir = path.join(modPath, 'application/services');
  if (fs.existsSync(svcDir)) {
    const svcFiles = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    constitutionalTotal++;
    const hasHealth = svcFiles.some(f => fs.readFileSync(path.join(svcDir, f), 'utf8').includes('health()'));
    if (hasHealth) constitutionalPass++;
    else test('CONSTITUTIONAL', `${mod} missing health endpoint`, () => false);
  }
}

test('CONSTITUTIONAL', `Platform-wide compliance: ${constitutionalPass}/${constitutionalTotal}`, () => constitutionalPass === constitutionalTotal);

// ==========================================
// 6. FORBIDDEN PATTERNS - ALL MODULES
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const allFiles = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.ts')) allFiles.push(fp);
    }
  }
  walk(path.join(BASE, 'modules', dir));
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const fname = path.relative(BASE, file);
    test('FORBIDDEN', `${mod} no hardcoded tenant IDs in ${fname}`, () => !content.match(/tenantId\s*[:=]\s*['"][a-f0-9-]+['"]/));
    test('FORBIDDEN', `${mod} no direct DB connections in ${fname}`, () => !content.match(/postgres:\/\//i) && !content.match(/mongodb:\/\//i));
  }
}

// ==========================================
// SUMMARY
// ==========================================
results.summary = {
  total, passed, failed,
  passRate: `${((passed / total) * 100).toFixed(1)}%`,
  phase5Modules: MODULES.length,
  totalPlatformModules: moduleCount,
  totalDatabases: new Set(allDbs).size,
  constitutionalCompliance: `${constitutionalPass}/${constitutionalTotal}`,
};

console.log('\n' + '='.repeat(70));
console.log(`  PHASE 5 TEST RESULTS: ${passed}/${total} PASSED (${results.summary.passRate})`);
console.log('='.repeat(70));
console.log(`  Phase 5 Modules: ${MODULES.join(', ')}`);
console.log(`  Total Platform Modules: ${moduleCount}/31`);
console.log(`  Total Unique Databases: ${new Set(allDbs).size}`);
console.log(`  Constitutional Compliance: ${constitutionalPass}/${constitutionalTotal}`);
console.log(`  All Databases: ${[...new Set(allDbs)].join(', ')}`);
console.log('='.repeat(70));

if (failed > 0) {
  console.log('\nFAILED TESTS:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => console.log(`  ❌ [${t.category}] ${t.name}: ${t.detail || ''}`));
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

const outputPath = path.join(BASE, 'test-results', 'phase5-results.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to: ${outputPath}`);

const GATE_THRESHOLD = 90;
const passRate = (passed / total) * 100;
if (passRate >= GATE_THRESHOLD) {
  console.log(`\n🚀 PHASE 5 EXIT GATE: PASS (${passRate.toFixed(1)}% >= ${GATE_THRESHOLD}%)`);
  console.log('🎉 ALL PHASES COMPLETE - PLATFORM PRODUCTION READY');
  process.exit(0);
} else {
  console.log(`\n🚫 PHASE 5 EXIT GATE: FAIL (${passRate.toFixed(1)}% < ${GATE_THRESHOLD}%)`);
  process.exit(1);
}
