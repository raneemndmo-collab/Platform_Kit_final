// M8: Workflow Engine - Application Service
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition, WorkflowInstance, WorkflowStepExecution, WorkflowAuditTrail } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(WorkflowDefinition, 'm8_connection') private defRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance, 'm8_connection') private instRepo: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowStepExecution, 'm8_connection') private stepRepo: Repository<WorkflowStepExecution>,
    @InjectRepository(WorkflowAuditTrail, 'm8_connection') private auditRepo: Repository<WorkflowAuditTrail>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Definition Management ===
  async createDefinition(tenantId: string, data: {
    name: string; moduleScope: string; triggerEvent: string; steps: unknown[]; description?: string;
  }): Promise<WorkflowDefinition> {
    if (!data.steps || data.steps.length === 0) throw new BadRequestException('Workflow must have at least one step');
    const def = this.defRepo.create({ tenantId, ...data });
    return this.defRepo.save(def);
  }

  async getDefinition(tenantId: string, id: string): Promise<WorkflowDefinition> {
    return this.defRepo.findOneOrFail({ where: { id, tenantId } });
  }

  async listDefinitions(tenantId: string, moduleScope?: string): Promise<WorkflowDefinition[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (moduleScope) where.moduleScope = moduleScope;
    return this.defRepo.find({ where });
  }

  // === Instance Lifecycle ===
  async startWorkflow(tenantId: string, data: {
    definitionId: string; entityType: string; entityId: string;
    initiatedBy: string; context?: Record<string, unknown>;
  }): Promise<WorkflowInstance> {
    const def = await this.defRepo.findOneOrFail({ where: { id: data.definitionId, tenantId, isActive: true } });
    const firstStep = def.steps[0];

    const instance = await this.instRepo.save(this.instRepo.create({
      tenantId, definitionId: data.definitionId, entityType: data.entityType,
      entityId: data.entityId, status: 'active', currentStepId: firstStep.stepId,
      context: data.context || {}, initiatedBy: data.initiatedBy,
    }));

    // Create first step execution
    await this.createStepExecution(tenantId, instance.id, firstStep);
    await this.logAudit(tenantId, instance.id, 'workflow.started', null, data.initiatedBy, { definitionName: def.name });
    this.safeEmit('workflow.started', { tenantId, instanceId: instance.id, entityType: data.entityType, entityId: data.entityId });
    return instance;
  }

  async processStep(tenantId: string, instanceId: string, data: {
    stepId: string; decision: string; decidedBy: string; comments?: string;
  }): Promise<WorkflowInstance> {
    const instance = await this.instRepo.findOneOrFail({ where: { id: instanceId, tenantId, status: 'active' } });
    const def = await this.defRepo.findOneOrFail({ where: { id: instance.definitionId, tenantId } });

    // Update step execution
    await this.stepRepo.update(
      { instanceId, tenantId, stepId: data.stepId, status: 'pending' },
      { status: data.decision, decidedBy: data.decidedBy, comments: data.comments, completedAt: new Date() },
    );

    await this.logAudit(tenantId, instanceId, `step.${data.decision}`, data.stepId, data.decidedBy, { comments: data.comments });
    this.safeEmit(`workflow.step.${data.decision}`, { tenantId, instanceId, stepId: data.stepId, entityType: instance.entityType, entityId: instance.entityId });

    // Find next step
    const currentStepDef = def.steps.find(s => s.stepId === data.stepId);
    const nextStepId = data.decision === 'approved' ? currentStepDef?.onApprove : currentStepDef?.onReject;

    if (!nextStepId || nextStepId === 'end') {
      const finalStatus = data.decision === 'approved' ? 'completed' : 'cancelled';
      await this.instRepo.update({ id: instanceId, tenantId }, { status: finalStatus, completedAt: new Date() });
      this.safeEmit(`workflow.${finalStatus}`, { tenantId, instanceId, entityType: instance.entityType, entityId: instance.entityId });
    } else {
      const nextStep = def.steps.find(s => s.stepId === nextStepId);
      if (nextStep) {
        await this.instRepo.update({ id: instanceId, tenantId }, { currentStepId: nextStepId });
        await this.createStepExecution(tenantId, instanceId, nextStep);
      }
    }

    return this.instRepo.findOneOrFail({ where: { id: instanceId, tenantId } });
  }

  async cancelWorkflow(tenantId: string, instanceId: string, cancelledBy: string): Promise<void> {
    await this.instRepo.update({ id: instanceId, tenantId, status: 'active' }, { status: 'cancelled', completedAt: new Date() });
    await this.logAudit(tenantId, instanceId, 'workflow.cancelled', null, cancelledBy, {});
    const inst = await this.instRepo.findOneOrFail({ where: { id: instanceId, tenantId } });
    this.safeEmit('workflow.cancelled', { tenantId, instanceId, entityType: inst.entityType, entityId: inst.entityId });
  }

  // === Queries ===
  async getInstance(tenantId: string, instanceId: string): Promise<WorkflowInstance> {
    return this.instRepo.findOneOrFail({ where: { id: instanceId, tenantId } });
  }

  async getInstancesByEntity(tenantId: string, entityType: string, entityId: string): Promise<WorkflowInstance[]> {
    return this.instRepo.find({ where: { tenantId, entityType, entityId }, order: { createdAt: 'DESC' } });
  }

  async getPendingApprovals(tenantId: string, assigneeId: string): Promise<WorkflowStepExecution[]> {
    return this.stepRepo.find({ where: { tenantId, assigneeId, status: 'pending' }, order: { createdAt: 'ASC' } });
  }

  async getStepExecutions(tenantId: string, instanceId: string): Promise<WorkflowStepExecution[]> {
    return this.stepRepo.find({ where: { instanceId, tenantId }, order: { createdAt: 'ASC' } });
  }

  async getAuditTrail(tenantId: string, instanceId: string): Promise<WorkflowAuditTrail[]> {
    return this.auditRepo.find({ where: { instanceId, tenantId }, order: { timestamp: 'ASC' } });
  }

  // === Private Helpers ===
  private async createStepExecution(tenantId: string, instanceId: string, stepDef: unknown): Promise<void> {
    await this.stepRepo.save(this.stepRepo.create({
      tenantId, instanceId, stepId: stepDef.stepId, stepName: stepDef.name,
      stepType: stepDef.type, status: 'pending',
      assigneeId: stepDef.config?.assigneeId || null,
      startedAt: new Date(),
      timeoutAt: stepDef.timeoutHours ? new Date(Date.now() + stepDef.timeoutHours * 3600000) : null,
    }));
  }

  private async logAudit(tenantId: string, instanceId: string, action: string, stepId: string | null, actorId: string, details: Record<string, unknown>): Promise<void> {
    await this.auditRepo.save(this.auditRepo.create({ tenantId, instanceId, action, stepId, actorId, details }));
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.defRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
