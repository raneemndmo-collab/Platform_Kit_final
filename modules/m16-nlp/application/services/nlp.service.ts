import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NLPTask, NLPModel, NLPTrainingData } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NLPService {
  private readonly logger = new Logger(NLPService.name);

  constructor(
    @InjectRepository(NLPTask, 'm16_connection') private taskRepo: Repository<NLPTask>,
    @InjectRepository(NLPModel, 'm16_connection') private modelRepo: Repository<NLPModel>,
    @InjectRepository(NLPTrainingData, 'm16_connection') private trainingRepo: Repository<NLPTrainingData>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processText(tenantId: string, data: { taskType: string; inputText: string; language?: string; requestSource: string }): Promise<NLPTask> {
    const model = await this.modelRepo.findOne({ where: { tenantId, taskType: data.taskType, status: 'active' } });
    const startTime = Date.now();
    const result = await this.executeNLP(data.taskType, data.inputText, data.language);
    const task = await this.taskRepo.save(this.taskRepo.create({
      tenantId, ...data, modelId: model?.id, result, status: 'completed', latencyMs: Date.now() - startTime,
    }));
    this.safeEmit('ai.nlp.processed', { tenantId, taskId: task.id, taskType: data.taskType });
    return task;
  }

  async sentiment(tenantId: string, text: string, source: string): Promise<NLPTask> {
    return this.processText(tenantId, { taskType: 'sentiment', inputText: text, requestSource: source });
  }

  async extractEntities(tenantId: string, text: string, source: string): Promise<NLPTask> {
    return this.processText(tenantId, { taskType: 'entity_extraction', inputText: text, requestSource: source });
  }

  async classify(tenantId: string, text: string, source: string): Promise<NLPTask> {
    return this.processText(tenantId, { taskType: 'classification', inputText: text, requestSource: source });
  }

  async translate(tenantId: string, text: string, targetLang: string, source: string): Promise<NLPTask> {
    return this.processText(tenantId, { taskType: 'translation', inputText: text, language: targetLang, requestSource: source });
  }

  async summarize(tenantId: string, text: string, source: string): Promise<NLPTask> {
    return this.processText(tenantId, { taskType: 'summarization', inputText: text, requestSource: source });
  }

  async registerModel(tenantId: string, data: { name: string; taskType: string; supportedLanguages?: string[] }): Promise<NLPModel> {
    return this.modelRepo.save(this.modelRepo.create({ tenantId, ...data }));
  }

  async addTrainingData(tenantId: string, data: { taskType: string; inputText: string; expectedOutput: unknown }): Promise<NLPTrainingData> {
    return this.trainingRepo.save(this.trainingRepo.create({ tenantId, ...data }));
  }

  private async executeNLP(taskType: string, text: string, language?: string): Promise<unknown> {
    // Simulated NLP processing - real impl routes to M11
    const results: Record<string, unknown> = {
      sentiment: { score: 0.85, label: 'positive', confidence: 0.92 },
      entity_extraction: { entities: [{ text: 'sample', type: 'ORG', confidence: 0.88 }] },
      classification: { category: 'business', confidence: 0.91 },
      translation: { translated: `[translated to ${language}]`, confidence: 0.95 },
      summarization: { summary: text.substring(0, 100) + '...', compressionRatio: 0.3 },
    };
    return results[taskType] || {};
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.taskRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
