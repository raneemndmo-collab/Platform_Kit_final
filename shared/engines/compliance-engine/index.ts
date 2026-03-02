// ═══════════════════════════════════════════════════════════════════════════════
// محرك الامتثال — Compliance Scoring Engine
// رصيد v6.4 — تسجيل الامتثال لـ 8 بنود تنظيمية + محرك الحالة
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BoundedMap } from '../../bounded-collections';

// ─── 8 بنود تنظيمية ────────────────────────────────────────────────────────
export enum RegulatoryClause {
  DATA_PROTECTION = 'DATA_PROTECTION',           // حماية البيانات الشخصية
  ACCESS_CONTROL = 'ACCESS_CONTROL',             // التحكم في الوصول
  AUDIT_LOGGING = 'AUDIT_LOGGING',               // تسجيل المراجعة
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',       // الاستجابة للحوادث
  DATA_RETENTION = 'DATA_RETENTION',             // الاحتفاظ بالبيانات
  ENCRYPTION_STANDARDS = 'ENCRYPTION_STANDARDS', // معايير التشفير
  VENDOR_MANAGEMENT = 'VENDOR_MANAGEMENT',       // إدارة الموردين
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',   // استمرارية الأعمال
}

export interface ClauseDefinition {
  clause: RegulatoryClause;
  name: string;
  nameAr: string;
  description: string;
  weight: number;
  controls: ControlRequirement[];
}

export interface ControlRequirement {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  evidenceType: 'document' | 'config' | 'log' | 'test' | 'policy';
}

export interface ClauseScore {
  clause: RegulatoryClause;
  score: number;           // 0-100
  maxScore: number;        // always 100
  controlsPassed: number;
  controlsFailed: number;
  controlsTotal: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  findings: ComplianceFinding[];
  lastAssessedAt: Date;
}

export interface ComplianceFinding {
  id: string;
  controlId: string;
  clause: RegulatoryClause;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  dueDate?: Date;
  resolvedAt?: Date;
}

export interface ComplianceSnapshot {
  id: string;
  tenantId: string;
  version: number;
  overallScore: number;
  clauseScores: ClauseScore[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  assessedAt: Date;
  assessedBy: string;
  previousVersion?: number;
  delta: number;
}

export interface EntityComplianceState {
  entityId: string;
  entityType: string;
  tenantId: string;
  currentVersion: number;
  snapshots: ComplianceSnapshot[];
  currentScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ─── تعريف البنود التنظيمية الثمانية ────────────────────────────────────────
const REGULATORY_CLAUSES: ClauseDefinition[] = [
  {
    clause: RegulatoryClause.DATA_PROTECTION,
    name: 'Data Protection',
    nameAr: 'حماية البيانات',
    description: 'Personal data protection and privacy controls',
    weight: 15,
    controls: [
      { id: 'DP-01', name: 'Data Classification', description: 'All data classified by sensitivity', mandatory: true, evidenceType: 'policy' },
      { id: 'DP-02', name: 'Consent Management', description: 'User consent collected and tracked', mandatory: true, evidenceType: 'log' },
      { id: 'DP-03', name: 'Data Minimization', description: 'Only necessary data collected', mandatory: true, evidenceType: 'config' },
      { id: 'DP-04', name: 'Privacy Impact Assessment', description: 'PIA conducted for new systems', mandatory: false, evidenceType: 'document' },
      { id: 'DP-05', name: 'Cross-border Transfer', description: 'Data transfer controls in place', mandatory: true, evidenceType: 'policy' },
    ],
  },
  {
    clause: RegulatoryClause.ACCESS_CONTROL,
    name: 'Access Control',
    nameAr: 'التحكم في الوصول',
    description: 'Identity and access management controls',
    weight: 15,
    controls: [
      { id: 'AC-01', name: 'RBAC Implementation', description: 'Role-based access control enforced', mandatory: true, evidenceType: 'config' },
      { id: 'AC-02', name: 'MFA Enforcement', description: 'Multi-factor authentication for privileged accounts', mandatory: true, evidenceType: 'config' },
      { id: 'AC-03', name: 'Least Privilege', description: 'Minimum necessary permissions granted', mandatory: true, evidenceType: 'config' },
      { id: 'AC-04', name: 'Access Reviews', description: 'Periodic access reviews conducted', mandatory: true, evidenceType: 'log' },
      { id: 'AC-05', name: 'Session Management', description: 'Session timeout and invalidation', mandatory: false, evidenceType: 'config' },
    ],
  },
  {
    clause: RegulatoryClause.AUDIT_LOGGING,
    name: 'Audit Logging',
    nameAr: 'تسجيل المراجعة',
    description: 'Comprehensive audit trail and logging',
    weight: 12,
    controls: [
      { id: 'AL-01', name: 'Event Logging', description: 'All security events logged', mandatory: true, evidenceType: 'log' },
      { id: 'AL-02', name: 'Log Integrity', description: 'Logs tamper-proof with hash chains', mandatory: true, evidenceType: 'test' },
      { id: 'AL-03', name: 'Log Retention', description: 'Logs retained per policy', mandatory: true, evidenceType: 'config' },
      { id: 'AL-04', name: 'Log Monitoring', description: 'Real-time log monitoring active', mandatory: true, evidenceType: 'config' },
    ],
  },
  {
    clause: RegulatoryClause.INCIDENT_RESPONSE,
    name: 'Incident Response',
    nameAr: 'الاستجابة للحوادث',
    description: 'Security incident detection and response',
    weight: 13,
    controls: [
      { id: 'IR-01', name: 'Incident Plan', description: 'Documented incident response plan', mandatory: true, evidenceType: 'document' },
      { id: 'IR-02', name: 'Detection Capability', description: 'Automated threat detection', mandatory: true, evidenceType: 'config' },
      { id: 'IR-03', name: 'Notification Process', description: 'Stakeholder notification within SLA', mandatory: true, evidenceType: 'policy' },
      { id: 'IR-04', name: 'Post-Incident Review', description: 'Root cause analysis conducted', mandatory: false, evidenceType: 'document' },
    ],
  },
  {
    clause: RegulatoryClause.DATA_RETENTION,
    name: 'Data Retention',
    nameAr: 'الاحتفاظ بالبيانات',
    description: 'Data lifecycle and retention management',
    weight: 10,
    controls: [
      { id: 'DR-01', name: 'Retention Policy', description: 'Defined retention periods per data type', mandatory: true, evidenceType: 'policy' },
      { id: 'DR-02', name: 'Automated Deletion', description: 'Automated data purge after retention', mandatory: true, evidenceType: 'config' },
      { id: 'DR-03', name: 'Archival Process', description: 'Secure archival for long-term data', mandatory: false, evidenceType: 'config' },
    ],
  },
  {
    clause: RegulatoryClause.ENCRYPTION_STANDARDS,
    name: 'Encryption Standards',
    nameAr: 'معايير التشفير',
    description: 'Data encryption at rest and in transit',
    weight: 13,
    controls: [
      { id: 'ES-01', name: 'Encryption at Rest', description: 'All sensitive data encrypted at rest', mandatory: true, evidenceType: 'config' },
      { id: 'ES-02', name: 'Encryption in Transit', description: 'TLS 1.2+ for all communications', mandatory: true, evidenceType: 'config' },
      { id: 'ES-03', name: 'Key Management', description: 'Secure key rotation and storage', mandatory: true, evidenceType: 'config' },
      { id: 'ES-04', name: 'Certificate Management', description: 'Certificate lifecycle managed', mandatory: false, evidenceType: 'config' },
    ],
  },
  {
    clause: RegulatoryClause.VENDOR_MANAGEMENT,
    name: 'Vendor Management',
    nameAr: 'إدارة الموردين',
    description: 'Third-party risk management',
    weight: 10,
    controls: [
      { id: 'VM-01', name: 'Vendor Assessment', description: 'Security assessment for all vendors', mandatory: true, evidenceType: 'document' },
      { id: 'VM-02', name: 'SLA Monitoring', description: 'Vendor SLA compliance tracked', mandatory: true, evidenceType: 'log' },
      { id: 'VM-03', name: 'Data Processing Agreements', description: 'DPA signed with all vendors', mandatory: true, evidenceType: 'document' },
    ],
  },
  {
    clause: RegulatoryClause.BUSINESS_CONTINUITY,
    name: 'Business Continuity',
    nameAr: 'استمرارية الأعمال',
    description: 'Disaster recovery and business continuity',
    weight: 12,
    controls: [
      { id: 'BC-01', name: 'BCP Document', description: 'Business continuity plan documented', mandatory: true, evidenceType: 'document' },
      { id: 'BC-02', name: 'Backup Strategy', description: 'Regular backups with tested restore', mandatory: true, evidenceType: 'test' },
      { id: 'BC-03', name: 'DR Testing', description: 'Annual disaster recovery testing', mandatory: true, evidenceType: 'test' },
      { id: 'BC-04', name: 'RTO/RPO Defined', description: 'Recovery objectives defined and met', mandatory: true, evidenceType: 'config' },
    ],
  },
];

// ─── محرك الحالة — State Engine ─────────────────────────────────────────────
@Injectable()
export class ComplianceStateEngine {
  private readonly logger = new Logger(ComplianceStateEngine.name);
  private readonly stateStore = new BoundedMap<string, EntityComplianceState>(5000);

  getState(tenantId: string, entityId: string): EntityComplianceState | undefined {
    return this.stateStore.get(`${tenantId}:${entityId}`);
  }

  createState(tenantId: string, entityId: string, entityType: string): EntityComplianceState {
    const state: EntityComplianceState = {
      entityId,
      entityType,
      tenantId,
      currentVersion: 0,
      snapshots: [],
      currentScore: 0,
      trend: 'stable',
    };
    this.stateStore.set(`${tenantId}:${entityId}`, state);
    return state;
  }

  addSnapshot(tenantId: string, entityId: string, snapshot: ComplianceSnapshot): EntityComplianceState {
    const key = `${tenantId}:${entityId}`;
    let state = this.stateStore.get(key);
    if (!state) {
      state = this.createState(tenantId, entityId, 'unknown');
    }
    state.currentVersion = snapshot.version;
    state.currentScore = snapshot.overallScore;
    state.snapshots.push(snapshot);
    // حساب الاتجاه بناءً على آخر 3 لقطات
    if (state.snapshots.length >= 3) {
      const recent = state.snapshots.slice(-3);
      const deltas = recent.map((s, i) => i > 0 ? s.overallScore - recent[i - 1].overallScore : 0).slice(1);
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      state.trend = avgDelta > 2 ? 'improving' : avgDelta < -2 ? 'declining' : 'stable';
    }
    this.stateStore.set(key, state);
    return state;
  }

  getHistory(tenantId: string, entityId: string): ComplianceSnapshot[] {
    const state = this.stateStore.get(`${tenantId}:${entityId}`);
    return state?.snapshots ?? [];
  }

  compareVersions(tenantId: string, entityId: string, v1: number, v2: number): { delta: number; clauseChanges: Array<{ clause: RegulatoryClause; oldScore: number; newScore: number }> } | null {
    const state = this.stateStore.get(`${tenantId}:${entityId}`);
    if (!state) return null;
    const snap1 = state.snapshots.find(s => s.version === v1);
    const snap2 = state.snapshots.find(s => s.version === v2);
    if (!snap1 || !snap2) return null;
    const clauseChanges: Array<{ clause: RegulatoryClause; oldScore: number; newScore: number }> = [];
    for (const cs2 of snap2.clauseScores) {
      const cs1 = snap1.clauseScores.find(c => c.clause === cs2.clause);
      if (cs1) {
        clauseChanges.push({ clause: cs2.clause, oldScore: cs1.score, newScore: cs2.score });
      }
    }
    return { delta: snap2.overallScore - snap1.overallScore, clauseChanges };
  }
}

// ─── محرك تسجيل الامتثال — Compliance Scoring Engine ────────────────────────
@Injectable()
export class ComplianceScoringEngine {
  private readonly logger = new Logger(ComplianceScoringEngine.name);
  private readonly scoreCache = new BoundedMap<string, ComplianceSnapshot>(2000);
  private readonly clauseDefinitions: ClauseDefinition[] = REGULATORY_CLAUSES;

  constructor(
    private readonly stateEngine: ComplianceStateEngine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getClauseDefinitions(): ClauseDefinition[] {
    return this.clauseDefinitions;
  }

  getClauseDefinition(clause: RegulatoryClause): ClauseDefinition | undefined {
    return this.clauseDefinitions.find(c => c.clause === clause);
  }

  assessClause(
    tenantId: string,
    clause: RegulatoryClause,
    controlResults: Array<{ controlId: string; passed: boolean; evidence?: string; notes?: string }>,
  ): ClauseScore {
    const definition = this.clauseDefinitions.find(c => c.clause === clause);
    if (!definition) throw new Error(`Unknown clause: ${clause}`);

    let passed = 0;
    let failed = 0;
    const findings: ComplianceFinding[] = [];

    for (const control of definition.controls) {
      const result = controlResults.find(r => r.controlId === control.id);
      if (result?.passed) {
        passed++;
      } else {
        failed++;
        findings.push({
          id: `F-${clause}-${control.id}-${Date.now()}`,
          controlId: control.id,
          clause,
          severity: control.mandatory ? 'high' : 'medium',
          title: `${control.name} — غير مستوفى`,
          description: control.description,
          recommendation: `تنفيذ ${control.name} وتقديم الدليل المطلوب (${control.evidenceType})`,
          status: 'open',
        });
      }
    }

    const total = definition.controls.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    const status: ClauseScore['status'] = score >= 80 ? 'compliant' : score >= 50 ? 'partial' : 'non_compliant';

    return {
      clause,
      score,
      maxScore: 100,
      controlsPassed: passed,
      controlsFailed: failed,
      controlsTotal: total,
      status,
      findings,
      lastAssessedAt: new Date(),
    };
  }

  assessAll(
    tenantId: string,
    entityId: string,
    assessedBy: string,
    allControlResults: Record<RegulatoryClause, Array<{ controlId: string; passed: boolean; evidence?: string }>>,
  ): ComplianceSnapshot {
    const clauseScores: ClauseScore[] = [];
    let weightedSum = 0;
    let totalWeight = 0;

    for (const def of this.clauseDefinitions) {
      const results = allControlResults[def.clause] ?? [];
      const clauseScore = this.assessClause(tenantId, def.clause, results);
      clauseScores.push(clauseScore);
      weightedSum += clauseScore.score * def.weight;
      totalWeight += def.weight;
    }

    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const state = this.stateEngine.getState(tenantId, entityId);
    const previousVersion = state?.currentVersion ?? 0;
    const previousScore = state?.currentScore ?? 0;

    const snapshot: ComplianceSnapshot = {
      id: `SNAP-${tenantId}-${entityId}-${Date.now()}`,
      tenantId,
      version: previousVersion + 1,
      overallScore,
      clauseScores,
      riskLevel: overallScore >= 80 ? 'low' : overallScore >= 60 ? 'medium' : overallScore >= 40 ? 'high' : 'critical',
      assessedAt: new Date(),
      assessedBy,
      previousVersion: previousVersion > 0 ? previousVersion : undefined,
      delta: overallScore - previousScore,
    };

    this.stateEngine.addSnapshot(tenantId, entityId, snapshot);
    this.scoreCache.set(`${tenantId}:${entityId}`, snapshot);

    this.safeEmit('compliance.assessed', { tenantId, entityId, overallScore, riskLevel: snapshot.riskLevel, version: snapshot.version });

    if (snapshot.riskLevel === 'critical') {
      this.safeEmit('compliance.critical', { tenantId, entityId, overallScore, clauseScores: clauseScores.filter(c => c.status === 'non_compliant') });
    }

    if (snapshot.delta < -10) {
      this.safeEmit('compliance.score.declined', { tenantId, entityId, delta: snapshot.delta, previousScore, newScore: overallScore });
    }

    this.logger.log(`[${tenantId}] Entity ${entityId} assessed: score=${overallScore}, risk=${snapshot.riskLevel}, delta=${snapshot.delta}`);
    return snapshot;
  }

  getLatestScore(tenantId: string, entityId: string): ComplianceSnapshot | undefined {
    return this.scoreCache.get(`${tenantId}:${entityId}`);
  }

  getScoreHistory(tenantId: string, entityId: string): ComplianceSnapshot[] {
    return this.stateEngine.getHistory(tenantId, entityId);
  }

  compareVersions(tenantId: string, entityId: string, v1: number, v2: number) {
    return this.stateEngine.compareVersions(tenantId, entityId, v1, v2);
  }

  calculateSectorScore(tenantId: string, entityIds: string[]): { averageScore: number; entityCount: number; riskDistribution: Record<string, number> } {
    let totalScore = 0;
    let count = 0;
    const riskDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const entityId of entityIds) {
      const snapshot = this.scoreCache.get(`${tenantId}:${entityId}`);
      if (snapshot) {
        totalScore += snapshot.overallScore;
        count++;
        riskDistribution[snapshot.riskLevel]++;
      }
    }

    return {
      averageScore: count > 0 ? Math.round(totalScore / count) : 0,
      entityCount: count,
      riskDistribution,
    };
  }

  private safeEmit(event: string, payload: Record<string, unknown>): void {
    try {
      this.eventEmitter.emit(event, payload);
    } catch (err) {
      this.logger.warn(`Event emit failed: ${event}`, err);
    }
  }
}

export { REGULATORY_CLAUSES };
