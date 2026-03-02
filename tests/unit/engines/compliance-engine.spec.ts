// اختبارات وحدة — محرك الامتثال + محرك الحالة
import { ComplianceScoringEngine, ComplianceStateEngine, RegulatoryClause, REGULATORY_CLAUSES } from '../../../shared/engines/compliance-engine';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ComplianceStateEngine', () => {
  let stateEngine: ComplianceStateEngine;

  beforeEach(() => {
    stateEngine = new ComplianceStateEngine();
  });

  it('should create entity state', () => {
    const state = stateEngine.createState('T1', 'E1', 'organization');
    expect(state.entityId).toBe('E1');
    expect(state.tenantId).toBe('T1');
    expect(state.currentVersion).toBe(0);
    expect(state.currentScore).toBe(0);
    expect(state.trend).toBe('stable');
  });

  it('should add snapshot and update version', () => {
    stateEngine.createState('T1', 'E1', 'organization');
    const snapshot = {
      id: 'SNAP-1', tenantId: 'T1', version: 1, overallScore: 75,
      clauseScores: [], riskLevel: 'medium' as const, assessedAt: new Date(),
      assessedBy: 'admin', delta: 75,
    };
    const state = stateEngine.addSnapshot('T1', 'E1', snapshot);
    expect(state.currentVersion).toBe(1);
    expect(state.currentScore).toBe(75);
    expect(state.snapshots).toHaveLength(1);
  });

  it('should calculate trend from 3+ snapshots', () => {
    stateEngine.createState('T1', 'E1', 'organization');
    const base = { tenantId: 'T1', clauseScores: [], riskLevel: 'medium' as const, assessedAt: new Date(), assessedBy: 'admin' };
    stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S1', version: 1, overallScore: 50, delta: 50 });
    stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S2', version: 2, overallScore: 60, delta: 10 });
    const state = stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S3', version: 3, overallScore: 70, delta: 10 });
    expect(state.trend).toBe('improving');
  });

  it('should return history', () => {
    stateEngine.createState('T1', 'E1', 'organization');
    const base = { tenantId: 'T1', clauseScores: [], riskLevel: 'low' as const, assessedAt: new Date(), assessedBy: 'admin' };
    stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S1', version: 1, overallScore: 80, delta: 80 });
    stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S2', version: 2, overallScore: 85, delta: 5 });
    const history = stateEngine.getHistory('T1', 'E1');
    expect(history).toHaveLength(2);
  });

  it('should compare versions', () => {
    stateEngine.createState('T1', 'E1', 'organization');
    const clauseScore1 = { clause: RegulatoryClause.DATA_PROTECTION, score: 60, maxScore: 100, controlsPassed: 3, controlsFailed: 2, controlsTotal: 5, status: 'partial' as const, findings: [], lastAssessedAt: new Date() };
    const clauseScore2 = { ...clauseScore1, score: 80 };
    const base = { tenantId: 'T1', riskLevel: 'medium' as const, assessedAt: new Date(), assessedBy: 'admin' };
    stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S1', version: 1, overallScore: 60, clauseScores: [clauseScore1], delta: 60 });
    stateEngine.addSnapshot('T1', 'E1', { ...base, id: 'S2', version: 2, overallScore: 80, clauseScores: [clauseScore2], delta: 20 });
    const comparison = stateEngine.compareVersions('T1', 'E1', 1, 2);
    expect(comparison).not.toBeNull();
    expect(comparison!.delta).toBe(20);
    expect(comparison!.clauseChanges[0].oldScore).toBe(60);
    expect(comparison!.clauseChanges[0].newScore).toBe(80);
  });
});

describe('ComplianceScoringEngine', () => {
  let scoringEngine: ComplianceScoringEngine;
  let stateEngine: ComplianceStateEngine;
  let eventEmitter: EventEmitter2;

  beforeEach(() => {
    stateEngine = new ComplianceStateEngine();
    eventEmitter = new EventEmitter2();
    scoringEngine = new ComplianceScoringEngine(stateEngine, eventEmitter);
  });

  it('should return all 8 clause definitions', () => {
    const clauses = scoringEngine.getClauseDefinitions();
    expect(clauses).toHaveLength(8);
    const clauseEnums = clauses.map(c => c.clause);
    expect(clauseEnums).toContain(RegulatoryClause.DATA_PROTECTION);
    expect(clauseEnums).toContain(RegulatoryClause.ACCESS_CONTROL);
    expect(clauseEnums).toContain(RegulatoryClause.AUDIT_LOGGING);
    expect(clauseEnums).toContain(RegulatoryClause.INCIDENT_RESPONSE);
    expect(clauseEnums).toContain(RegulatoryClause.DATA_RETENTION);
    expect(clauseEnums).toContain(RegulatoryClause.ENCRYPTION_STANDARDS);
    expect(clauseEnums).toContain(RegulatoryClause.VENDOR_MANAGEMENT);
    expect(clauseEnums).toContain(RegulatoryClause.BUSINESS_CONTINUITY);
  });

  it('should assess a single clause with all controls passed', () => {
    const def = scoringEngine.getClauseDefinition(RegulatoryClause.DATA_PROTECTION)!;
    const results = def.controls.map(c => ({ controlId: c.id, passed: true }));
    const score = scoringEngine.assessClause('T1', RegulatoryClause.DATA_PROTECTION, results);
    expect(score.score).toBe(100);
    expect(score.status).toBe('compliant');
    expect(score.controlsPassed).toBe(def.controls.length);
    expect(score.controlsFailed).toBe(0);
    expect(score.findings).toHaveLength(0);
  });

  it('should assess a single clause with some controls failed', () => {
    const def = scoringEngine.getClauseDefinition(RegulatoryClause.ACCESS_CONTROL)!;
    const results = def.controls.map((c, i) => ({ controlId: c.id, passed: i < 2 }));
    const score = scoringEngine.assessClause('T1', RegulatoryClause.ACCESS_CONTROL, results);
    expect(score.controlsPassed).toBe(2);
    expect(score.controlsFailed).toBe(def.controls.length - 2);
    expect(score.findings.length).toBeGreaterThan(0);
  });

  it('should assess all 8 clauses and produce overall score', () => {
    const allResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean }>> = {} as any;
    for (const def of REGULATORY_CLAUSES) {
      allResults[def.clause] = def.controls.map(c => ({ controlId: c.id, passed: true }));
    }
    const snapshot = scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    expect(snapshot.overallScore).toBe(100);
    expect(snapshot.riskLevel).toBe('low');
    expect(snapshot.clauseScores).toHaveLength(8);
    expect(snapshot.version).toBe(1);
  });

  it('should emit compliance.assessed event', () => {
    const emitted: any[] = [];
    eventEmitter.on('compliance.assessed', (data: any) => emitted.push(data));
    const allResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean }>> = {} as any;
    for (const def of REGULATORY_CLAUSES) {
      allResults[def.clause] = def.controls.map(c => ({ controlId: c.id, passed: true }));
    }
    scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].tenantId).toBe('T1');
  });

  it('should emit compliance.critical for low scores', () => {
    const emitted: any[] = [];
    eventEmitter.on('compliance.critical', (data: any) => emitted.push(data));
    const allResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean }>> = {} as any;
    for (const def of REGULATORY_CLAUSES) {
      allResults[def.clause] = def.controls.map(c => ({ controlId: c.id, passed: false }));
    }
    scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    expect(emitted).toHaveLength(1);
  });

  it('should calculate sector score', () => {
    const allResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean }>> = {} as any;
    for (const def of REGULATORY_CLAUSES) {
      allResults[def.clause] = def.controls.map(c => ({ controlId: c.id, passed: true }));
    }
    scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    scoringEngine.assessAll('T1', 'E2', 'admin', allResults);
    const sector = scoringEngine.calculateSectorScore('T1', ['E1', 'E2']);
    expect(sector.averageScore).toBe(100);
    expect(sector.entityCount).toBe(2);
  });

  it('should track score history', () => {
    const allResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean }>> = {} as any;
    for (const def of REGULATORY_CLAUSES) {
      allResults[def.clause] = def.controls.map(c => ({ controlId: c.id, passed: true }));
    }
    scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    const history = scoringEngine.getScoreHistory('T1', 'E1');
    expect(history).toHaveLength(2);
    expect(history[1].version).toBe(2);
  });

  it('should calculate weighted overall score correctly', () => {
    const allResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean }>> = {} as any;
    // بند واحد 100% والباقي 0%
    for (const def of REGULATORY_CLAUSES) {
      allResults[def.clause] = def.controls.map(c => ({
        controlId: c.id,
        passed: def.clause === RegulatoryClause.DATA_PROTECTION,
      }));
    }
    const snapshot = scoringEngine.assessAll('T1', 'E1', 'admin', allResults);
    // DATA_PROTECTION weight=15, total weight=100, so score = 15
    expect(snapshot.overallScore).toBe(15);
    expect(snapshot.riskLevel).toBe('critical');
  });
});
