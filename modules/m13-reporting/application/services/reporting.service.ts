// M13: Reporting - Application Service
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportDefinition, ReportExecution, ReportSchedule, ReportTemplate } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(ReportDefinition, 'm13_connection') private defRepo: Repository<ReportDefinition>,
    @InjectRepository(ReportExecution, 'm13_connection') private execRepo: Repository<ReportExecution>,
    @InjectRepository(ReportSchedule, 'm13_connection') private schedRepo: Repository<ReportSchedule>,
    @InjectRepository(ReportTemplate, 'm13_connection') private templRepo: Repository<ReportTemplate>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Report Definitions ===
  async createDefinition(tenantId: string, data: {
    name: string; category: string; dataSourceConfig: unknown; columns: unknown[];
    filters?: unknown; groupBy?: string[]; sortBy?: unknown[]; templateId?: string; createdBy: string;
  }): Promise<ReportDefinition> {
    if (!data.columns || data.columns.length === 0) throw new BadRequestException('Report must have at least one column');
    const def = this.defRepo.create({ tenantId, ...data });
    const saved = await this.defRepo.save(def);
    this.safeEmit('report.definition.created', { tenantId, reportId: saved.id, name: data.name });
    return saved;
  }

  async getDefinition(tenantId: string, id: string): Promise<ReportDefinition> {
    return this.defRepo.findOneOrFail({ where: { id, tenantId } });
  }

  async listDefinitions(tenantId: string, category?: string): Promise<ReportDefinition[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (category) where.category = category;
    return this.defRepo.find({ where, order: { name: 'ASC' } });
  }

  // === Report Execution ===
  async executeReport(tenantId: string, data: {
    definitionId: string; parameters?: unknown; outputFormat?: string; requestedBy: string;
  }): Promise<ReportExecution> {
    const def = await this.defRepo.findOneOrFail({ where: { id: data.definitionId, tenantId, isActive: true } });
    const exec = await this.execRepo.save(this.execRepo.create({
      tenantId, definitionId: data.definitionId,
      status: 'pending', parameters: data.parameters || {},
      outputFormat: data.outputFormat || 'pdf', requestedBy: data.requestedBy,
    }));

    // Simulate async report generation
    await this.processReportGeneration(tenantId, exec.id, def);
    return this.execRepo.findOneOrFail({ where: { id: exec.id, tenantId } });
  }

  private async processReportGeneration(tenantId: string, executionId: string, def: ReportDefinition): Promise<void> {
    const startTime = Date.now();
    try {
      await this.execRepo.update({ id: executionId, tenantId }, { status: 'processing', startedAt: new Date() });

      // Simulate data aggregation and rendering
      const rowCount = Math.floor(Math.random() * 1000) + 100;
      const executionTimeMs = Date.now() - startTime;

      await this.execRepo.update({ id: executionId, tenantId }, {
        status: 'completed', rowCount, executionTimeMs,
        completedAt: new Date(),
      });

      this.safeEmit('report.generated', { tenantId, executionId, definitionName: def.name, rowCount, executionTimeMs });
    } catch (e) {
      await this.execRepo.update({ id: executionId, tenantId }, {
        status: 'failed', errorMessage: e.message, completedAt: new Date(),
      });
      this.safeEmit('report.failed', { tenantId, executionId, error: e.message });
    }
  }

  async getExecution(tenantId: string, id: string): Promise<ReportExecution> {
    return this.execRepo.findOneOrFail({ where: { id, tenantId } });
  }

  async listExecutions(tenantId: string, definitionId?: string): Promise<ReportExecution[]> {
    const where: Record<string, unknown> = { tenantId };
    if (definitionId) where.definitionId = definitionId;
    return this.execRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  // === Scheduling ===
  async createSchedule(tenantId: string, data: {
    definitionId: string; cronExpression: string; parameters?: unknown;
    outputFormat?: string; recipients?: string[];
  }): Promise<ReportSchedule> {
    await this.defRepo.findOneOrFail({ where: { id: data.definitionId, tenantId } });
    return this.schedRepo.save(this.schedRepo.create({ tenantId, ...data, outputFormat: data.outputFormat || 'pdf' }));
  }

  async listSchedules(tenantId: string): Promise<ReportSchedule[]> {
    return this.schedRepo.find({ where: { tenantId, isActive: true } });
  }

  async toggleSchedule(tenantId: string, id: string, isActive: boolean): Promise<void> {
    await this.schedRepo.update({ id, tenantId }, { isActive });
  }

  // === Templates ===
  async createTemplate(tenantId: string, data: {
    name: string; category: string; templateContent: string;
    headerConfig?: unknown; footerConfig?: unknown;
  }): Promise<ReportTemplate> {
    return this.templRepo.save(this.templRepo.create({ tenantId, ...data }));
  }

  async listTemplates(tenantId: string, category?: string): Promise<ReportTemplate[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (category) where.category = category;
    return this.templRepo.find({ where });
  }

  // === Health ===
  async health(): Promise<{ status: string; database: string }> {
    try { await this.defRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
