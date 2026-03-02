// ═══════════════════════════════════════════════════════════════════════════════
// محرك التنفيذ — Execution Engine (K3 متوافق)
// رصيد v6.4 — تنسيق المهام، معالجة البيانات، قابلية التوسع
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';
import { CircuitBreaker } from '../../circuit-breaker';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ExecutionTask {
  id: string;
  tenantId: string;
  type: string;
  priority: TaskPriority;
  payload: Record<string, unknown>;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  timeout: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  parentTaskId?: string;
  dependencies: string[];
}

export interface ExecutionPlan {
  id: string;
  tenantId: string;
  tasks: ExecutionTask[];
  dag: Map<string, string[]>;
  status: TaskStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExecutionMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageLatencyMs: number;
  throughputPerSecond: number;
  activeWorkers: number;
  queueDepth: number;
}

@Injectable()
export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);
  private readonly breaker = new CircuitBreaker('execution-engine', 5, 30000);
  private readonly taskQueue = new BoundedMap<string, ExecutionTask[]>(10000);
  private readonly activePlans = new BoundedMap<string, ExecutionPlan>(5000);
  private readonly taskResults = new BoundedMap<string, unknown>(50000);
  private readonly metrics = new BoundedMap<string, ExecutionMetrics>(1000);
  private readonly MAX_CONCURRENT_TASKS = 100;
  private readonly QUERY_TIMEOUT_MS = 30000;

  /** إنشاء خطة تنفيذ مع DAG */
  createPlan(tenantId: string, tasks: Omit<ExecutionTask, 'id' | 'tenantId' | 'status' | 'createdAt'>[]): ExecutionPlan {
    this.logger.log(`إنشاء خطة تنفيذ: tenant=${tenantId} tasks=${tasks.length}`);
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const dag = new Map<string, string[]>();

    const executionTasks: ExecutionTask[] = tasks.map((t, i) => {
      const taskId = `task_${planId}_${i}`;
      dag.set(taskId, t.dependencies || []);
      return {
        ...t,
        id: taskId,
        tenantId,
        status: 'pending' as TaskStatus,
        createdAt: new Date(),
        retries: 0,
        dependencies: t.dependencies || [],
      };
    });

    const plan: ExecutionPlan = {
      id: planId,
      tenantId,
      tasks: executionTasks,
      dag,
      status: 'pending',
      progress: 0,
    };

    this.activePlans.set(planId, plan);
    return plan;
  }

  /** تنفيذ خطة كاملة مع احترام التبعيات */
  async executePlan(planId: string): Promise<ExecutionPlan> {
    const plan = this.activePlans.get(planId);
    if (!plan) throw new Error(`خطة غير موجودة: ${planId}`);

    this.logger.log(`بدء تنفيذ الخطة: ${planId} tenant=${plan.tenantId}`);
    plan.status = 'running';
    plan.startedAt = new Date();

    return this.breaker.execute(async () => {
      const completed = new Set<string>();
      let iterations = 0;
      const maxIterations = plan.tasks.length * 3;

      while (completed.size < plan.tasks.length && iterations < maxIterations) {
        iterations++;
        const ready = plan.tasks.filter(t =>
          t.status === 'pending' &&
          t.dependencies.every(dep => completed.has(dep))
        );

        if (ready.length === 0 && completed.size < plan.tasks.length) {
          const pending = plan.tasks.filter(t => t.status === 'pending');
          if (pending.length > 0) {
            plan.status = 'failed';
            this.logger.error(`Deadlock في الخطة: ${planId}`);
            break;
          }
        }

        const batch = ready.slice(0, this.MAX_CONCURRENT_TASKS);
        await Promise.allSettled(batch.map(task => this.executeTask(task)));

        for (const task of batch) {
          if (task.status === 'completed') {
            completed.add(task.id);
          } else if (task.status === 'failed' && task.retries < task.maxRetries) {
            task.status = 'retrying';
            task.retries++;
            task.status = 'pending';
          } else if (task.status === 'failed') {
            completed.add(task.id);
          }
        }

        plan.progress = (completed.size / plan.tasks.length) * 100;
      }

      plan.status = plan.tasks.every(t => t.status === 'completed') ? 'completed' : 'failed';
      plan.completedAt = new Date();
      this.activePlans.set(planId, plan);
      this.logger.log(`انتهاء الخطة: ${planId} status=${plan.status} progress=${plan.progress}%`);
      return plan;
    });
  }

  /** تنفيذ مهمة واحدة مع timeout */
  private async executeTask(task: ExecutionTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    this.logger.debug(`تنفيذ مهمة: ${task.id} type=${task.type}`);

    try {
      const result = await Promise.race([
        this.processTask(task),
        this.createTimeout(task.timeout || this.QUERY_TIMEOUT_MS),
      ]);
      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      this.taskResults.set(task.id, result);
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      this.logger.error(`فشل مهمة: ${task.id} error=${error.message}`);
    }
  }

  private async processTask(task: ExecutionTask): Promise<unknown> {
    // محاكاة معالجة المهمة حسب النوع
    switch (task.type) {
      case 'data_processing':
        return { processed: true, records: task.payload.recordCount ?? 0 };
      case 'aggregation':
        return { aggregated: true, metrics: {} };
      case 'transformation':
        return { transformed: true, output: task.payload };
      case 'validation':
        return { valid: true, errors: [] };
      case 'export':
        return { exported: true, format: task.payload.format ?? 'json' };
      default:
        return { executed: true, type: task.type };
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`انتهت المهلة: ${ms}ms`)), ms)
    );
  }

  /** الحصول على مقاييس الأداء */
  getMetrics(tenantId: string): ExecutionMetrics {
    const plans = [...this.activePlans.values()].filter(p => p.tenantId === tenantId);
    const allTasks = plans.flatMap(p => p.tasks);
    const completed = allTasks.filter(t => t.status === 'completed');
    const latencies = completed
      .filter(t => t.startedAt && t.completedAt)
      .map(t => t.completedAt!.getTime() - t.startedAt!.getTime());

    return {
      totalTasks: allTasks.length,
      completedTasks: completed.length,
      failedTasks: allTasks.filter(t => t.status === 'failed').length,
      averageLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      throughputPerSecond: completed.length > 0 ? completed.length / Math.max(1, (Date.now() - (plans[0]?.startedAt?.getTime() ?? Date.now())) / 1000) : 0,
      activeWorkers: allTasks.filter(t => t.status === 'running').length,
      queueDepth: allTasks.filter(t => t.status === 'pending').length,
    };
  }

  /** إلغاء خطة تنفيذ */
  cancelPlan(planId: string): boolean {
    const plan = this.activePlans.get(planId);
    if (!plan) return false;
    plan.status = 'cancelled';
    plan.tasks.filter(t => t.status === 'pending' || t.status === 'running').forEach(t => { t.status = 'cancelled'; });
    this.activePlans.set(planId, plan);
    return true;
  }
}
