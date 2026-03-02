// ═══════════════════════════════════════════════════════════════════════════════
// وحدة التكامل النهائي — Final Integration Module
// رصيد v6.4 — ربط جميع المحركات مع K3/K4/K5 والهندسة المعمارية المبنية على الأحداث
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

// ═══════════════════════════════════════════════════════════════════════════════
// سجل المحركات — Engine Registry
// ═══════════════════════════════════════════════════════════════════════════════

export interface EngineInfo {
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'error' | 'initializing';
  capabilities: string[];
  dependencies: string[];
  healthCheck: () => Promise<boolean>;
}

@Injectable()
export class EngineRegistry implements OnModuleInit {
  private readonly logger = new Logger(EngineRegistry.name);
  private readonly engines = new BoundedMap<string, EngineInfo>(100);
  private readonly eventHandlers = new BoundedMap<string, Array<(data: unknown) => Promise<void>>>(1000);

  async onModuleInit(): Promise<void> {
    this.logger.log('تهيئة سجل المحركات — Engine Registry');
    await this.registerCoreEngines();
  }

  private async registerCoreEngines(): Promise<void> {
    const coreEngines: Array<Omit<EngineInfo, 'healthCheck'>> = [
      { name: 'rag-v2', version: '2.0.0', status: 'active', capabilities: ['retrieval', 'generation', 'embedding'], dependencies: [] },
      { name: 'rule-engine', version: '1.0.0', status: 'active', capabilities: ['evaluation', 'condition-matching'], dependencies: [] },
      { name: 'insight-engine', version: '1.0.0', status: 'active', capabilities: ['anomaly-detection', 'trend-analysis'], dependencies: [] },
      { name: 'execution-engine', version: '1.0.0', status: 'active', capabilities: ['task-orchestration', 'dag-execution'], dependencies: ['k7-orchestration'] },
      { name: 'analytics-engine', version: '1.0.0', status: 'active', capabilities: ['aggregation', 'pipeline', 'insights'], dependencies: ['insight-engine'] },
      { name: 'report-engine', version: '1.0.0', status: 'active', capabilities: ['pdf', 'pptx', 'docx', 'html'], dependencies: ['analytics-engine'] },
      { name: 'performance-monitor', version: '1.0.0', status: 'active', capabilities: ['metrics', 'alerting', 'health'], dependencies: ['k9-monitoring'] },
      { name: 'data-pipeline', version: '1.0.0', status: 'active', capabilities: ['etl', 'elt', 'streaming'], dependencies: [] },
      { name: 'nlp-engine', version: '1.0.0', status: 'active', capabilities: ['sentiment', 'ner', 'classification', 'arabic'], dependencies: [] },
      { name: 'vision-engine', version: '1.0.0', status: 'active', capabilities: ['ocr', 'classification', 'detection'], dependencies: [] },
      { name: 'knowledge-graph', version: '1.0.0', status: 'active', capabilities: ['graph-query', 'path-finding', 'relations'], dependencies: [] },
      { name: 'decision-engine', version: '1.0.0', status: 'active', capabilities: ['policy-evaluation', 'scoring'], dependencies: ['rule-engine'] },
      { name: 'workflow-engine', version: '1.0.0', status: 'active', capabilities: ['automation', 'approval', 'triggers'], dependencies: ['k7-orchestration'] },
      { name: 'notification-engine', version: '1.0.0', status: 'active', capabilities: ['email', 'sms', 'push', 'webhook'], dependencies: ['k6-notification'] },
    ];

    for (const engine of coreEngines) {
      this.engines.set(engine.name, {
        ...engine,
        healthCheck: async () => true,
      });
    }
    this.logger.log(`تم تسجيل ${coreEngines.length} محرك أساسي`);
  }

  /** تسجيل محرك */
  register(engine: EngineInfo): void {
    this.engines.set(engine.name, engine);
    this.logger.log(`تسجيل محرك: ${engine.name} v${engine.version}`);
  }

  /** الحصول على محرك */
  get(name: string): EngineInfo | undefined {
    return this.engines.get(name);
  }

  /** فحص صحة جميع المحركات */
  async healthCheck(): Promise<Record<string, { status: string; healthy: boolean }>> {
    const results: Record<string, { status: string; healthy: boolean }> = {};
    for (const [name, engine] of this.engines) {
      try {
        const healthy = await engine.healthCheck();
        results[name] = { status: engine.status, healthy };
      } catch {
        results[name] = { status: 'error', healthy: false };
      }
    }
    return results;
  }

  /** قائمة جميع المحركات */
  listEngines(): Array<{ name: string; version: string; status: string; capabilities: string[] }> {
    return [...this.engines.values()].map(e => ({
      name: e.name, version: e.version, status: e.status, capabilities: e.capabilities,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ناقل الأحداث المركزي — Central Event Bus (K5 متوافق)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DomainEvent {
  id: string;
  type: string;
  tenantId: string;
  source: string;
  timestamp: Date;
  data: Record<string, unknown>;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

@Injectable()
export class CentralEventBus {
  private readonly logger = new Logger(CentralEventBus.name);
  private readonly handlers = new BoundedMap<string, EventHandler[]>(10000);
  private readonly eventLog = new BoundedMap<string, DomainEvent[]>(50000);
  private readonly deadLetterQueue = new BoundedMap<string, Array<{ event: DomainEvent; error: string; timestamp: Date }>>(10000);

  /** الاشتراك في حدث */
  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    this.logger.debug(`اشتراك في: ${eventType}`);
  }

  /** نشر حدث */
  async publish(event: DomainEvent): Promise<void> {
    this.logger.debug(`نشر حدث: ${event.type} tenant=${event.tenantId}`);

    // تسجيل الحدث
    const tenantLog = this.eventLog.get(event.tenantId) || [];
    tenantLog.push(event);
    if (tenantLog.length > 1000) tenantLog.shift();
    this.eventLog.set(event.tenantId, tenantLog);

    // تنفيذ المعالجات
    const handlers = this.handlers.get(event.type) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (error: any) {
        this.logger.error(`فشل معالجة حدث: ${event.type} — ${error.message}`);
        const dlq = this.deadLetterQueue.get(event.tenantId) || [];
        dlq.push({ event, error: error.message, timestamp: new Date() });
        this.deadLetterQueue.set(event.tenantId, dlq);
      }
    }
  }

  /** نشر مجموعة أحداث */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /** الحصول على سجل الأحداث */
  getEventLog(tenantId: string, limit = 100): DomainEvent[] {
    return (this.eventLog.get(tenantId) || []).slice(-limit);
  }

  /** الحصول على قائمة الأحداث الميتة */
  getDeadLetterQueue(tenantId: string): Array<{ event: DomainEvent; error: string; timestamp: Date }> {
    return this.deadLetterQueue.get(tenantId) || [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// مدير التكوين المركزي — Central Config Manager (K4 متوافق)
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class CentralConfigManager {
  private readonly logger = new Logger(CentralConfigManager.name);
  private readonly configs = new BoundedMap<string, Record<string, unknown>>(10000);
  private readonly configHistory = new BoundedMap<string, Array<{ config: Record<string, unknown>; timestamp: Date; changedBy: string }>>(5000);

  /** تعيين تكوين المستأجر */
  setConfig(tenantId: string, key: string, value: unknown, changedBy = 'system'): void {
    const config = this.configs.get(tenantId) || {};
    config[key] = value;
    this.configs.set(tenantId, config);

    const history = this.configHistory.get(tenantId) || [];
    history.push({ config: { [key]: value }, timestamp: new Date(), changedBy });
    this.configHistory.set(tenantId, history);
    this.logger.log(`تحديث تكوين: ${key} tenant=${tenantId}`);
  }

  /** الحصول على تكوين */
  getConfig(tenantId: string, key?: string): unknown {
    const config = this.configs.get(tenantId) || {};
    return key ? config[key] : config;
  }

  /** الحصول على تاريخ التكوين */
  getConfigHistory(tenantId: string): Array<{ config: Record<string, unknown>; timestamp: Date; changedBy: string }> {
    return this.configHistory.get(tenantId) || [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// مدير المهام المركزي — Central Task Manager (K3/K7 متوافق)
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class CentralTaskManager {
  private readonly logger = new Logger(CentralTaskManager.name);
  private readonly taskQueue = new BoundedMap<string, Array<{
    id: string; type: string; priority: number; payload: unknown;
    status: 'queued' | 'processing' | 'done' | 'failed';
    createdAt: Date; processedAt?: Date;
  }>>(10000);

  /** إضافة مهمة للقائمة */
  enqueue(tenantId: string, type: string, payload: unknown, priority = 0): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const queue = this.taskQueue.get(tenantId) || [];
    queue.push({ id: taskId, type, priority, payload, status: 'queued', createdAt: new Date() });
    queue.sort((a, b) => b.priority - a.priority);
    this.taskQueue.set(tenantId, queue);
    return taskId;
  }

  /** معالجة المهمة التالية */
  async dequeue(tenantId: string): Promise<{ id: string; type: string; payload: unknown } | null> {
    const queue = this.taskQueue.get(tenantId) || [];
    const task = queue.find(t => t.status === 'queued');
    if (!task) return null;
    task.status = 'processing';
    task.processedAt = new Date();
    this.taskQueue.set(tenantId, queue);
    return { id: task.id, type: task.type, payload: task.payload };
  }

  /** إتمام مهمة */
  complete(tenantId: string, taskId: string, success: boolean): void {
    const queue = this.taskQueue.get(tenantId) || [];
    const task = queue.find(t => t.id === taskId);
    if (task) {
      task.status = success ? 'done' : 'failed';
      this.taskQueue.set(tenantId, queue);
    }
  }

  /** حالة القائمة */
  getQueueStatus(tenantId: string): { queued: number; processing: number; done: number; failed: number } {
    const queue = this.taskQueue.get(tenantId) || [];
    return {
      queued: queue.filter(t => t.status === 'queued').length,
      processing: queue.filter(t => t.status === 'processing').length,
      done: queue.filter(t => t.status === 'done').length,
      failed: queue.filter(t => t.status === 'failed').length,
    };
  }
}
