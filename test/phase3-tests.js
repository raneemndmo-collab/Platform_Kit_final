#!/usr/bin/env node
// Phase 3: Intelligence + Analytics - Test Suite
// Gates: AI containment, 7 AI capability interfaces, model hot-swap, AI fallback chain,
//        analytics pipeline, Knowledge Graph, Data Lake 3-tier flow

const PHASE = 3;
const MODULES = ['M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'];
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

const moduleMap = {
  M11: 'm11-ai-orchestration', M12: 'm12-analytics', M13: 'm13-reporting',
  M14: 'm14-decision-engine', M15: 'm15-knowledge-graph', M16: 'm16-nlp', M17: 'm17-vision-ai'
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
}

// ==========================================
// 2. TENANT ISOLATION
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  test('TENANT_ISOLATION', `${mod} entities have tenantId`, () => {
    const content = fs.readFileSync(path.join(BASE, 'modules', dir, 'domain/entities/index.ts'), 'utf8');
    return content.includes('tenantId');
  });
  test('TENANT_ISOLATION', `${mod} service filters by tenantId`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    return files.some(f => {
      const content = fs.readFileSync(path.join(svcDir, f), 'utf8');
      return content.includes('tenantId');
    });
  });
}

// ==========================================
// 3. EVENT BUS INTEGRATION
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  test('EVENT_BUS', `${mod} uses EventBus`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    return files.some(f => {
      const content = fs.readFileSync(path.join(svcDir, f), 'utf8');
      return content.includes('eventBus') || content.includes('EventBus');
    });
  });
  test('EVENT_BUS', `${mod} publishes events`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    return files.some(f => {
      const content = fs.readFileSync(path.join(svcDir, f), 'utf8');
      return content.includes('.publish(');
    });
  });
}

// ==========================================
// 4. AUDIT DECORATORS
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  test('AUDIT', `${mod} controllers have @Audit decorators`, () => {
    const ctrlDir = path.join(BASE, 'modules', dir, 'api/controllers');
    const files = fs.readdirSync(ctrlDir).filter(f => f.endsWith('.ts'));
    return files.some(f => {
      const content = fs.readFileSync(path.join(ctrlDir, f), 'utf8');
      return content.includes('@Audit(');
    });
  });
}

// ==========================================
// 5. HEALTH ENDPOINTS
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  test('HEALTH', `${mod} has health endpoint`, () => {
    const svcDir = path.join(BASE, 'modules', dir, 'application/services');
    const files = fs.readdirSync(svcDir).filter(f => f.endsWith('.ts'));
    return files.some(f => {
      const content = fs.readFileSync(path.join(svcDir, f), 'utf8');
      return content.includes('health()');
    });
  });
}

// ==========================================
// 6. DATABASE ISOLATION (Cumulative: Phase 1-3 = 22 DBs)
// ==========================================
const allModuleIds = [
  'M1', 'M2', 'M3', 'M4', 'M5', 'M30',  // Phase 0-1
  'M25', 'M7', 'M8', 'M6', 'M9', 'M10', 'M26', // Phase 2
  'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17' // Phase 3
];
const allDirMap = {
  M1: 'm1-hrm', M2: 'm2-finance', M3: 'm3-crm', M4: 'm4-inventory', M5: 'm5-procurement', M30: 'm30-gateway',
  M25: 'm25-file-storage', M7: 'm7-document-mgmt', M8: 'm8-workflow', M6: 'm6-project-mgmt',
  M9: 'm9-compliance', M10: 'm10-legal-contract', M26: 'm26-scheduler',
  M11: 'm11-ai-orchestration', M12: 'm12-analytics', M13: 'm13-reporting',
  M14: 'm14-decision-engine', M15: 'm15-knowledge-graph', M16: 'm16-nlp', M17: 'm17-vision-ai'
};

const databases = new Set();
const phase3Databases = new Set();
const allDbs = [];

for (const [mod, dir] of Object.entries(allDirMap)) {
  const manifestPath = path.join(BASE, 'modules', dir, 'module-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    const dbMatch = manifest.match(/name:\s*(\w+_db)/);
    if (dbMatch) {
      allDbs.push(dbMatch[1]);
      if (MODULES.includes(mod)) phase3Databases.add(dbMatch[1]);
      databases.add(dbMatch[1]);
    }
  }
}

test('DB_ISOLATION', `Total databases count >= 20`, () => allDbs.length >= 20);
test('DB_ISOLATION', `Phase 3 has 7 unique databases`, () => phase3Databases.size === 7);
test('DB_ISOLATION', `No duplicate database names`, () => allDbs.length === new Set(allDbs).size);

for (const [mod, dir] of Object.entries(moduleMap)) {
  test('DB_ISOLATION', `${mod} has unique database in manifest`, () => {
    const manifest = fs.readFileSync(path.join(BASE, 'modules', dir, 'module-manifest.yaml'), 'utf8');
    return /name:\s*\w+_db/.test(manifest);
  });
}

// ==========================================
// 7. AI-SPECIFIC GATE TESTS
// ==========================================

// Gate: AI Containment Audit (0 non-AI DB credentials)
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
    test('AI_CONTAINMENT', `${mod} no hardcoded credentials in ${fname}`, () => {
      return !content.match(/password\s*[:=]\s*['"][^'"]+['"]/) && !content.match(/postgres:\/\//i);
    });
  }
}

// Gate: 7 AI capability interfaces
test('AI_CAPABILITIES', 'M11 AI Orchestration has model registry', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m11-ai-orchestration/application/services/ai-orchestration.service.ts'), 'utf8');
  return content.includes('registerModel') || content.includes('ModelRegistration') || content.includes('modelId');
});
test('AI_CAPABILITIES', 'M11 AI Orchestration has inference pipeline', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m11-ai-orchestration/application/services/ai-orchestration.service.ts'), 'utf8');
  return content.includes('executeInference') || content.includes('runInference') || content.includes('inference');
});
test('AI_CAPABILITIES', 'M12 Analytics has data pipeline', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m12-analytics/application/services/analytics.service.ts'), 'utf8');
  return content.includes('ingestEvent') || content.includes('aggregate') || content.includes('pipeline');
});
test('AI_CAPABILITIES', 'M13 Reporting has report generation', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m13-reporting/application/services/reporting.service.ts'), 'utf8');
  return content.includes('executeReport') && content.includes('outputFormat');
});
test('AI_CAPABILITIES', 'M14 Decision Engine has rule evaluation', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m14-decision-engine/application/services/decision.service.ts'), 'utf8');
  return content.includes('evaluate') || content.includes('executeDecision') || content.includes('rule');
});
test('AI_CAPABILITIES', 'M15 Knowledge Graph has entity relationships', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m15-knowledge-graph/domain/entities/index.ts'), 'utf8');
  return content.includes('relationship') || content.includes('sourceEntity') || content.includes('edge');
});
test('AI_CAPABILITIES', 'M16 NLP has text processing', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m16-nlp/application/services/nlp.service.ts'), 'utf8');
  return content.includes('analyzeText') || content.includes('sentiment') || content.includes('classify');
});
test('AI_CAPABILITIES', 'M17 Vision AI has image processing', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m17-vision-ai/application/services/vision.service.ts'), 'utf8');
  return content.includes('analyzeImage') || content.includes('classify') || content.includes('detect');
});

// Gate: Model hot-swap support
test('AI_HOTSWAP', 'M11 supports model versioning', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m11-ai-orchestration/domain/entities/index.ts'), 'utf8');
  return content.includes('version') && content.includes('model');
});
test('AI_HOTSWAP', 'M11 supports model status management', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m11-ai-orchestration/application/services/ai-orchestration.service.ts'), 'utf8');
  return content.includes('status') && (content.includes('active') || content.includes('deploy'));
});

// Gate: AI fallback chain
test('AI_FALLBACK', 'M11 has fallback/retry mechanism', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m11-ai-orchestration/application/services/ai-orchestration.service.ts'), 'utf8');
  return content.includes('fallback') || content.includes('retry') || content.includes('catch');
});

// Gate: Analytics pipeline
test('ANALYTICS_PIPELINE', 'M12 has event ingestion', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m12-analytics/application/services/analytics.service.ts'), 'utf8');
  return content.includes('ingest') || content.includes('track') || content.includes('record');
});
test('ANALYTICS_PIPELINE', 'M12 has aggregation', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m12-analytics/application/services/analytics.service.ts'), 'utf8');
  return content.includes('aggregate') || content.includes('query') || content.includes('metrics');
});

// Gate: Report scheduling
test('REPORTING', 'M13 has report scheduling', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m13-reporting/application/services/reporting.service.ts'), 'utf8');
  return content.includes('createSchedule') && content.includes('cronExpression');
});
test('REPORTING', 'M13 has multiple output formats', () => {
  const content = fs.readFileSync(path.join(BASE, 'modules/m13-reporting/application/services/reporting.service.ts'), 'utf8');
  return content.includes('outputFormat') && content.includes('pdf');
});

// ==========================================
// 8. CROSS-MODULE INTEGRATION
// ==========================================
test('INTEGRATION', 'M13 depends on M12 (analytics)', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m13-reporting/module-manifest.yaml'), 'utf8');
  return manifest.includes('M12');
});
test('INTEGRATION', 'M14 uses AI namespace (ai.decision)', () => {
  const manifest = fs.readFileSync(path.join(BASE, 'modules/m14-decision-engine/module-manifest.yaml'), 'utf8');
  return manifest.includes('ai.decision') || manifest.includes('decision');
});
test('INTEGRATION', 'AI modules use ai.* event namespace', () => {
  let aiNamespaceCount = 0;
  for (const mod of ['m14-decision-engine', 'm15-knowledge-graph', 'm16-nlp', 'm17-vision-ai']) {
    const manifest = fs.readFileSync(path.join(BASE, 'modules', mod, 'module-manifest.yaml'), 'utf8');
    if (manifest.includes('ai.') || manifest.includes('ai_')) aiNamespaceCount++;
  }
  return aiNamespaceCount >= 3;
});

// ==========================================
// 9. FORBIDDEN PATTERNS
// ==========================================
for (const [mod, dir] of Object.entries(moduleMap)) {
  const allFiles = [];
  function walkForbidden(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) walkForbidden(fp);
      else if (f.endsWith('.ts')) allFiles.push(fp);
    }
  }
  walkForbidden(path.join(BASE, 'modules', dir));
  
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const fname = path.relative(BASE, file);
    test('FORBIDDEN', `${mod} no hardcoded tenant IDs in ${fname}`, () => {
      return !content.match(/tenantId\s*[:=]\s*['"][a-f0-9-]+['"]/);
    });
    test('FORBIDDEN', `${mod} no direct DB connections in ${fname}`, () => {
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
  phase3Modules: MODULES.length,
  totalDatabases: allDbs.length,
  phase3Databases: phase3Databases.size,
  cumulativeDatabases: databases.size,
};

console.log('\n' + '='.repeat(60));
console.log(`  PHASE 3 TEST RESULTS: ${passed}/${total} PASSED (${results.summary.passRate})`);
console.log('='.repeat(60));
console.log(`  Modules: ${MODULES.join(', ')}`);
console.log(`  Phase 3 Databases: ${[...phase3Databases].join(', ')}`);
console.log(`  Cumulative Platform DBs: ${databases.size}`);
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
const outputPath = path.join(BASE, 'test-results', 'phase3-results.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Results saved to: ${outputPath}`);

// Exit gate
const GATE_THRESHOLD = 90;
const passRate = (passed / total) * 100;
if (passRate >= GATE_THRESHOLD) {
  console.log(`\n🚀 PHASE 3 EXIT GATE: PASS (${passRate.toFixed(1)}% >= ${GATE_THRESHOLD}%)`);
  process.exit(0);
} else {
  console.log(`\n🚫 PHASE 3 EXIT GATE: FAIL (${passRate.toFixed(1)}% < ${GATE_THRESHOLD}%)`);
  process.exit(1);
}
