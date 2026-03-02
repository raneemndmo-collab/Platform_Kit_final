// M9: Compliance Management - Application Service
import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceFramework, ComplianceControl, ComplianceAssessment, ComplianceRisk, ComplianceViolation } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(ComplianceFramework, 'm9_connection') private frameworkRepo: Repository<ComplianceFramework>,
    @InjectRepository(ComplianceControl, 'm9_connection') private controlRepo: Repository<ComplianceControl>,
    @InjectRepository(ComplianceAssessment, 'm9_connection') private assessmentRepo: Repository<ComplianceAssessment>,
    @InjectRepository(ComplianceRisk, 'm9_connection') private riskRepo: Repository<ComplianceRisk>,
    @InjectRepository(ComplianceViolation, 'm9_connection') private violationRepo: Repository<ComplianceViolation>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Frameworks ===
  async createFramework(tenantId: string, data: { name: string; version: string; description?: string; requirements?: unknown[] }): Promise<ComplianceFramework> {
    const fw = await this.frameworkRepo.save(this.frameworkRepo.create({ tenantId, ...data }));
    this.safeEmit('compliance.framework.created', { tenantId, frameworkId: fw.id });
    return fw;
  }

  async listFrameworks(tenantId: string): Promise<ComplianceFramework[]> {
    return this.frameworkRepo.find({ where: { tenantId, status: 'active' } });
  }

  // === Controls ===
  async createControl(tenantId: string, data: {
    frameworkId: string; requirementId: string; controlName: string; type: string; ownerId?: string; description?: string;
  }): Promise<ComplianceControl> {
    return this.controlRepo.save(this.controlRepo.create({ tenantId, ...data }));
  }

  async assessControl(tenantId: string, controlId: string, data: { status: string; evidence?: unknown[] }): Promise<ComplianceControl> {
    await this.controlRepo.update({ id: controlId, tenantId }, {
      status: data.status, evidence: data.evidence, lastAssessedAt: new Date(),
    });
    const ctrl = await this.controlRepo.findOneOrFail({ where: { id: controlId, tenantId } });
    if (data.status === 'non_compliant') {
      this.safeEmit('compliance.control.non_compliant', { tenantId, controlId, controlName: ctrl.controlName });
    }
    return ctrl;
  }

  async listControls(tenantId: string, frameworkId?: string): Promise<ComplianceControl[]> {
    const where: Record<string, unknown> = { tenantId };
    if (frameworkId) where.frameworkId = frameworkId;
    return this.controlRepo.find({ where });
  }

  // === Assessments ===
  async startAssessment(tenantId: string, data: { frameworkId: string; assessorId: string }): Promise<ComplianceAssessment> {
    const assessment = await this.assessmentRepo.save(this.assessmentRepo.create({ tenantId, ...data }));
    this.safeEmit('compliance.assessment.started', { tenantId, assessmentId: assessment.id });
    return assessment;
  }

  async completeAssessment(tenantId: string, assessmentId: string, data: { findings: unknown[]; complianceScore: number }): Promise<ComplianceAssessment> {
    await this.assessmentRepo.update({ id: assessmentId, tenantId }, {
      status: 'completed', findings: data.findings, complianceScore: data.complianceScore, completedAt: new Date(),
    });
    const assessment = await this.assessmentRepo.findOneOrFail({ where: { id: assessmentId, tenantId } });
    this.safeEmit('compliance.assessment.completed', { tenantId, assessmentId, score: data.complianceScore });
    return assessment;
  }

  async getComplianceDashboard(tenantId: string): Promise<{
    totalControls: number; compliant: number; nonCompliant: number;
    openRisks: number; openViolations: number; overallScore: number;
  }> {
    const controls = await this.controlRepo.find({ where: { tenantId } });
    const compliant = controls.reduce((___c, c) => (c.status === 'compliant') ? ___c + 1 : ___c, 0);
    const nonCompliant = controls.reduce((___c, c) => (c.status === 'non_compliant') ? ___c + 1 : ___c, 0);
    const openRisks = await this.riskRepo.count({ where: { tenantId, status: 'open' } });
    const openViolations = await this.violationRepo.count({ where: { tenantId, status: 'open' } });
    const overallScore = controls.length > 0 ? (compliant / controls.length) * 100 : 0;

    return { totalControls: controls.length, compliant, nonCompliant, openRisks, openViolations, overallScore };
  }

  // === Risks ===
  async createRisk(tenantId: string, data: {
    title: string; category: string; riskLevel: string; likelihood: number; impact: number; ownerId?: string;
  }): Promise<ComplianceRisk> {
    const risk = await this.riskRepo.save(this.riskRepo.create({ tenantId, ...data }));
    this.safeEmit('compliance.risk.created', { tenantId, riskId: risk.id, riskLevel: data.riskLevel });
    return risk;
  }

  async listRisks(tenantId: string, status?: string): Promise<ComplianceRisk[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.riskRepo.find({ where, order: { riskLevel: 'ASC' } });
  }

  // === Violations ===
  async reportViolation(tenantId: string, data: {
    controlId: string; violationType: string; severity: string; description?: string;
  }): Promise<ComplianceViolation> {
    const violation = await this.violationRepo.save(this.violationRepo.create({ tenantId, ...data }));
    this.safeEmit('compliance.violation.reported', { tenantId, violationId: violation.id, severity: data.severity });
    return violation;
  }

  async resolveViolation(tenantId: string, violationId: string, data: { resolvedBy: string; remediationPlan: string }): Promise<void> {
    await this.violationRepo.update({ id: violationId, tenantId }, {
      status: 'resolved', resolvedBy: data.resolvedBy, remediationPlan: data.remediationPlan, resolvedAt: new Date(),
    });
    this.safeEmit('compliance.violation.resolved', { tenantId, violationId });
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.frameworkRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
