// ═══════════════════════════════════════════════════════════════════════════════
// محرك سير العمل — Workflow Engine
// رصيد v6.4 — أتمتة سير العمل مع عزل المستأجر
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export type StepType = 'task' | 'decision' | 'parallel' | 'wait' | 'notify' | 'transform' | 'approval';
export type WorkflowStatus = 'draft' | 'active' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, unknown>;
  nextSteps: string[];
  timeout?: number;
  retries?: number;
  assignee?: string;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  steps: WorkflowStep[];
  startStepId: string;
  triggers: Array<{ type: 'event' | 'schedule' | 'manual'; config: Record<string, unknown> }>;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  tenantId: string;
  status: WorkflowStatus;
  currentStepId: string;
  context: Record<string, unknown>;
  history: Array<{ stepId: string; status: string; timestamp: Date; result?: unknown }>;
  startedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);
  private readonly definitions = new BoundedMap<string, WorkflowDefinition[]>(5000);
  private readonly instances = new BoundedMap<string, WorkflowInstance[]>(10000);

  registerWorkflow(definition: WorkflowDefinition): WorkflowDefinition {
    this.logger.log(`تسجيل سير عمل: ${definition.name} tenant=${definition.tenantId}`);
    const tenantDefs = this.definitions.get(definition.tenantId) || [];
    tenantDefs.push(definition);
    this.definitions.set(definition.tenantId, tenantDefs);
    return definition;
  }

  async startWorkflow(tenantId: string, definitionId: string, context: Record<string, unknown> = {}): Promise<WorkflowInstance> {
    const defs = this.definitions.get(tenantId) || [];
    const def = defs.find(d => d.id === definitionId);
    if (!def) throw new Error(`سير عمل غير موجود: ${definitionId}`);

    const instance: WorkflowInstance = {
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      definitionId, tenantId,
      status: 'running',
      currentStepId: def.startStepId,
      context,
      history: [],
      startedAt: new Date(),
    };

    const tenantInstances = this.instances.get(tenantId) || [];
    tenantInstances.push(instance);
    this.instances.set(tenantId, tenantInstances);

    await this.executeStep(instance, def);
    return instance;
  }

  private async executeStep(instance: WorkflowInstance, definition: WorkflowDefinition): Promise<void> {
    const step = definition.steps.find(s => s.id === instance.currentStepId);
    if (!step) {
      instance.status = 'completed';
      instance.completedAt = new Date();
      return;
    }

    this.logger.log(`تنفيذ خطوة: ${step.name} instance=${instance.id}`);
    try {
      const result = await this.processStep(step, instance.context);
      instance.history.push({ stepId: step.id, status: 'completed', timestamp: new Date(), result });
      instance.context = { ...instance.context, [`step_${step.id}_result`]: result };

      if (step.nextSteps.length > 0) {
        instance.currentStepId = step.nextSteps[0];
        await this.executeStep(instance, definition);
      } else {
        instance.status = 'completed';
        instance.completedAt = new Date();
      }
    } catch (error: any) {
      instance.history.push({ stepId: step.id, status: 'failed', timestamp: new Date(), result: error.message });
      instance.status = 'failed';
    }
  }

  private async processStep(step: WorkflowStep, context: Record<string, unknown>): Promise<unknown> {
    switch (step.type) {
      case 'task': return { completed: true, step: step.name };
      case 'decision': return { branch: step.nextSteps[0] };
      case 'approval': return { approved: true, approver: step.assignee };
      case 'notify': return { notified: true, target: step.config.target };
      case 'transform': return { transformed: true };
      case 'wait': return new Promise(resolve => setTimeout(() => resolve({ waited: true }), Math.min(step.timeout || 1000, 5000)));
      default: return { executed: true };
    }
  }

  getInstances(tenantId: string): WorkflowInstance[] {
    return this.instances.get(tenantId) || [];
  }

  getInstance(tenantId: string, instanceId: string): WorkflowInstance | undefined {
    return (this.instances.get(tenantId) || []).find(i => i.id === instanceId);
  }

  async pauseWorkflow(tenantId: string, instanceId: string): Promise<boolean> {
    const instance = this.getInstance(tenantId, instanceId);
    if (instance && instance.status === 'running') {
      instance.status = 'paused';
      return true;
    }
    return false;
  }

  async resumeWorkflow(tenantId: string, instanceId: string): Promise<boolean> {
    const instance = this.getInstance(tenantId, instanceId);
    if (instance && instance.status === 'paused') {
      instance.status = 'running';
      const defs = this.definitions.get(tenantId) || [];
      const def = defs.find(d => d.id === instance.definitionId);
      if (def) await this.executeStep(instance, def);
      return true;
    }
    return false;
  }
}
