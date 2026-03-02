// M11: AI Orchestration - Application Service
// AI Containment: 0 non-AI DB credentials, fallback chain L0-L4, model hot-swap
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIModel, AIInferenceRequest, AIContainmentRule, AIFallbackChain, AICapabilityInterface } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AIOrchestrationService {
  private readonly logger = new Logger(AIOrchestrationService.name);

  constructor(
    @InjectRepository(AIModel, 'm11_connection') private modelRepo: Repository<AIModel>,
    @InjectRepository(AIInferenceRequest, 'm11_connection') private inferRepo: Repository<AIInferenceRequest>,
    @InjectRepository(AIContainmentRule, 'm11_connection') private containRepo: Repository<AIContainmentRule>,
    @InjectRepository(AIFallbackChain, 'm11_connection') private fallbackRepo: Repository<AIFallbackChain>,
    @InjectRepository(AICapabilityInterface, 'm11_connection') private capRepo: Repository<AICapabilityInterface>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Model Registry ===
  async registerModel(tenantId: string, data: {
    name: string; provider: string; modelIdentifier: string; capability: string;
    version: string; config?: unknown; priority?: number; costPerToken?: number;
  }): Promise<AIModel> {
    const model = await this.modelRepo.save(this.modelRepo.create({ tenantId, ...data }));
    this.safeEmit('ai.model.registered', { tenantId, modelId: model.id, capability: data.capability });
    return model;
  }

  async hotSwapModel(tenantId: string, oldModelId: string, newModelId: string): Promise<void> {
    const oldModel = await this.modelRepo.findOneOrFail({ where: { id: oldModelId, tenantId } });
    const newModel = await this.modelRepo.findOneOrFail({ where: { id: newModelId, tenantId } });
    if (oldModel.capability !== newModel.capability)
      throw new BadRequestException('Models must have same capability for hot-swap');
    
    await this.modelRepo.update({ id: oldModelId, tenantId }, { status: 'deprecated', priority: 999 });
    await this.modelRepo.update({ id: newModelId, tenantId }, { status: 'active', priority: oldModel.priority });
    
    // Update fallback chains
    const chains = await this.fallbackRepo.find({ where: { tenantId, capability: oldModel.capability } });
    for (const chain of chains) {
      chain.chain = chain.chain.map(l => l.modelId === oldModelId ? { ...l, modelId: newModelId } : l);
      await this.fallbackRepo.save(chain);
    }
    
    this.safeEmit('ai.model.hot_swapped', { tenantId, oldModelId, newModelId, capability: oldModel.capability });
  }

  async listModels(tenantId: string, capability?: string): Promise<AIModel[]> {
    const where: Record<string, unknown> = { tenantId };
    if (capability) where.capability = capability;
    return this.modelRepo.find({ where, order: { priority: 'ASC' } });
  }

  // === Inference with Fallback Chain ===
  async inference(tenantId: string, data: {
    capability: string; input: unknown; requestSource: string;
  }): Promise<AIInferenceRequest> {
    // Check containment rules
    await this.checkContainment(tenantId, data);

    // Get fallback chain
    const chain = await this.fallbackRepo.findOne({ where: { tenantId, capability: data.capability, isActive: true } });
    const levels = chain?.chain || [];
    
    if (levels.length === 0) {
      // Direct model lookup
      const model = await this.modelRepo.findOne({
        where: { tenantId, capability: data.capability, status: 'active' },
        order: { priority: 'ASC' },
      });
      if (!model) throw new BadRequestException(`No active model for capability: ${data.capability}`);
      levels.push({ level: 0, modelId: model.id, timeoutMs: 30000 });
    }

    // Try each level in the fallback chain
    for (const level of levels) {
      const request = this.inferRepo.create({
        tenantId, modelId: level.modelId, capability: data.capability,
        requestSource: data.requestSource, input: data.input,
        status: 'processing', fallbackLevel: level.level,
      });
      const saved = await this.inferRepo.save(request);

      try {
        // Simulated inference execution
        const startTime = Date.now();
        const result = await this.executeInference(tenantId, level.modelId, data.input, level.timeoutMs);
        const latencyMs = Date.now() - startTime;

        await this.inferRepo.update(saved.id, {
          status: 'completed', output: result.output,
          inputTokens: result.inputTokens, outputTokens: result.outputTokens, latencyMs,
        });

        await this.eventBus.publish('ai.inference.completed', {
          tenantId, requestId: saved.id, capability: data.capability,
          fallbackLevel: level.level, latencyMs,
        });

        return this.inferRepo.findOneOrFail({ where: { id: saved.id } });
      } catch (error) {
        await this.inferRepo.update(saved.id, { status: 'fallback', errorMessage: error.message });
        await this.eventBus.publish('ai.inference.fallback', {
          tenantId, requestId: saved.id, fromLevel: level.level,
          toLevel: level.level + 1, error: error.message,
        });
        continue; // Try next level
      }
    }

    throw new BadRequestException('All fallback levels exhausted');
  }

  // === Containment ===
  async addContainmentRule(tenantId: string, data: {
    ruleName: string; ruleType: string; conditions: unknown; actions: unknown;
  }): Promise<AIContainmentRule> {
    return this.containRepo.save(this.containRepo.create({ tenantId, ...data }));
  }

  private async checkContainment(tenantId: string, data: unknown): Promise<void> {
    const rules = await this.containRepo.find({ where: { tenantId, isActive: true } });
    for (const rule of rules) {
      if (rule.ruleType === 'rate_limit') {
        const recentCount = await this.inferRepo.count({
          where: { tenantId, createdAt: new Date(Date.now() - 60000) as any },
        });
        if (recentCount > (rule.conditions.maxPerMinute || 100)) {
          throw new BadRequestException('AI rate limit exceeded');
        }
      }
      // Additional containment checks would go here
    }
  }

  // === Fallback Chains ===
  async configureFallbackChain(tenantId: string, data: {
    capability: string; chain: { level: number; modelId: string; timeoutMs: number }[];
  }): Promise<AIFallbackChain> {
    // Validate chain levels 0-4
    if (data.chain.some(l => l.level < 0 || l.level > 4))
      throw new BadRequestException('Fallback levels must be 0-4');
    return this.fallbackRepo.save(this.fallbackRepo.create({ tenantId, ...data }));
  }

  // === Capability Interfaces ===
  async registerCapability(tenantId: string, data: {
    capabilityName: string; inputSchema: unknown; outputSchema: unknown; description?: string;
  }): Promise<AICapabilityInterface> {
    return this.capRepo.save(this.capRepo.create({ tenantId, ...data }));
  }

  async listCapabilities(tenantId: string): Promise<AICapabilityInterface[]> {
    return this.capRepo.find({ where: { tenantId, isActive: true } });
  }

  // === Private ===
  private async executeInference(tenantId: string, modelId: string, input: unknown, timeoutMs: number): Promise<unknown> {
    // Simulated - real implementation would call model provider
    return { output: { generated: true }, inputTokens: 100, outputTokens: 50 };
  }

  async health(): Promise<{ status: string; database: string; activeModels: number }> {
    try {
      await this.modelRepo.query('SELECT 1');
      const activeModels = await this.modelRepo.count({ where: { status: 'active' } });
      return { status: 'healthy', database: 'connected', activeModels };
    } catch { return { status: 'unhealthy', database: 'disconnected', activeModels: 0 }; }
  }
}
