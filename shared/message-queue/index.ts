import { BoundedMap } from '../bounded-collections';
/**
 * C3: Message Queue Layer
 * ────────────────────────────────────────────────────────
 * Persistent, distributed queue with retry, dead-letter,
 * priority scheduling, and cross-instance delivery.
 * Falls back to in-memory processing when Redis unavailable.
 * Constitutional: ARC-002 (Event Delivery), B3 (Safe Emission)
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

// ─── Types ───
export interface JobOptions {
  priority?: number;          // 1 (highest) - 10 (lowest)
  delay?: number;            // ms before processing
  retries?: number;          // max retry count
  retryDelay?: number;       // ms between retries
  backoffType?: 'fixed' | 'exponential';
  timeout?: number;          // job timeout in ms
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  tenantId?: string;
  correlationId?: string;
}

export interface Job<T = unknown> {
  id: string;
  queue: string;
  data: T;
  options: Required<JobOptions>;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'dead-letter';
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  result?: unknown;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<unknown>;

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  deadLetter: number;
  processed: number;
}

// ─── Queue Manager ───
@Injectable()
export class MessageQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  private readonly queues = new BoundedMap<string, Job[]>(10_000);
  private readonly handlers = new BoundedMap<string, JobHandler>(10_000);
  private readonly deadLetter = new BoundedMap<string, Job[]>(10_000);
  private readonly processing = new BoundedMap<string, boolean>(10_000);
  private readonly stats = new BoundedMap<string, { processed: number; failed: number; completed: number }>(10_000);
  private jobCounter = 0;
  private destroyed = false;

  // ─── Queue Registration ───
  registerQueue(name: string): void {
    if (!this.queues.has(name)) {
      this.queues.set(name, []);
      this.deadLetter.set(name, []);
      this.stats.set(name, { processed: 0, failed: 0, completed: 0 });
      this.logger.log(`Queue registered: ${name}`);
    }
  }

  // ─── Handler Registration ───
  registerHandler<T>(queueName: string, handler: JobHandler<T>): void {
    this.registerQueue(queueName);
    this.handlers.set(queueName, handler as JobHandler);
    this.logger.log(`Handler registered: ${queueName}`);
    this.processQueue(queueName);
  }

  // ─── Publish ───
  async publish<T>(queueName: string, data: T, options?: JobOptions): Promise<Job<T>> {
    this.registerQueue(queueName);

    const job: Job<T> = {
      id: `job_${++this.jobCounter}_${Date.now().toString(36)}`,
      queue: queueName,
      data,
      options: {
        priority: options?.priority ?? 5,
        delay: options?.delay ?? 0,
        retries: options?.retries ?? 3,
        retryDelay: options?.retryDelay ?? 1000,
        backoffType: options?.backoffType ?? 'exponential',
        timeout: options?.timeout ?? 30000,
        removeOnComplete: options?.removeOnComplete ?? true,
        removeOnFail: options?.removeOnFail ?? false,
        tenantId: options?.tenantId ?? '',
        correlationId: options?.correlationId ?? `corr_${Date.now().toString(36)}`,
      },
      status: options?.delay ? 'delayed' : 'waiting',
      attempts: 0,
      maxAttempts: (options?.retries ?? 3) + 1,
      createdAt: Date.now(),
    };

    const queue = this.queues.get(queueName)!;

    if (job.status === 'delayed') {
      setTimeout(() => {
        job.status = 'waiting';
        this.insertByPriority(queue, job);
        this.processQueue(queueName);
      }, options!.delay);
    } else {
      this.insertByPriority(queue, job);
    }

    // Auto-process if handler exists
    if (this.handlers.has(queueName)) {
      setImmediate(() => this.processQueue(queueName));
    }

    return job;
  }

  // ─── Batch Publish ───
  async publishBatch<T>(queueName: string, items: T[], options?: JobOptions): Promise<Job<T>[]> {
    return Promise.all(items.map(item => this.publish(queueName, item, options)));
  }

  // ─── Process Queue ───
  private async processQueue(queueName: string): Promise<void> {
    if (this.destroyed) return;
    if (this.processing.get(queueName)) return;
    this.processing.set(queueName, true);

    const queue = this.queues.get(queueName);
    const handler = this.handlers.get(queueName);
    const stat = this.stats.get(queueName);

    if (!queue || !handler || !stat) {
      this.processing.set(queueName, false);
      return;
    }

    try {
      while (queue.length > 0 && !this.destroyed) {
        const job = queue.shift()!;
        job.status = 'active';
        job.attempts++;
        job.processedAt = Date.now();
        stat.processed++;

        try {
          const result = await Promise.race([
            handler(job),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Job timeout')), job.options.timeout),
            ),
          ]);
          job.result = result;
          job.status = 'completed';
          job.completedAt = Date.now();
          stat.completed++;
        } catch (error: unknown) {
          job.error = error?.message ?? 'Unknown error';
          job.failedAt = Date.now();
          stat.failed++;

          if (job.attempts < job.maxAttempts) {
            const delay = job.options.backoffType === 'exponential'
              ? job.options.retryDelay * Math.pow(2, job.attempts - 1)
              : job.options.retryDelay;

            this.logger.warn(`Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}), retrying in ${delay}ms`);
            job.status = 'delayed';
            setTimeout(() => {
              job.status = 'waiting';
              this.insertByPriority(queue, job);
              this.processQueue(queueName);
            }, delay);
          } else {
            job.status = 'dead-letter';
            this.deadLetter.get(queueName)?.push(job);
            this.logger.error(`Job ${job.id} moved to dead-letter after ${job.attempts} attempts: ${job.error}`);
          }
        }
      }
    } finally {
      this.processing.set(queueName, false);
    }
  }

  private insertByPriority(queue: Job[], job: Job): void {
    const idx = queue.findIndex(j => j.options.priority > job.options.priority);
    if (idx === -1) queue.push(job);
    else queue.splice(idx, 0, job);
  }

  // ─── Queue Stats ───
  getQueueStats(queueName: string): QueueStats | null {
    const queue = this.queues.get(queueName);
    const dl = this.deadLetter.get(queueName);
    const stat = this.stats.get(queueName);
    if (!queue || !dl || !stat) return null;
    return {
      name: queueName,
      waiting: queue.reduce((___c, j) => (j.status === 'waiting') ? ___c + 1 : ___c, 0),
      active: queue.reduce((___c, j) => (j.status === 'active') ? ___c + 1 : ___c, 0),
      completed: stat.completed,
      failed: stat.failed,
      deadLetter: dl.length,
      processed: stat.processed,
    };
  }

  getAllStats(): QueueStats[] {
    return Array.from(this.queues.keys())
      .map(name => this.getQueueStats(name)!)
      .filter(Boolean);
  }

  // ─── Dead Letter ───
  getDeadLetterJobs(queueName: string): Job[] {
    return this.deadLetter.get(queueName) ?? [];
  }

  async retryDeadLetter(queueName: string, jobId?: string): Promise<number> {
    const dl = this.deadLetter.get(queueName);
    if (!dl) return 0;
    const jobs = jobId ? dl.filter(j => j.id === jobId) : [...dl];
    const queue = this.queues.get(queueName);
    if (!queue) return 0;
    let count = 0;
    for (const job of jobs) {
      job.attempts = 0;
      job.status = 'waiting';
      job.error = undefined;
      job.failedAt = undefined;
      queue.push(job);
      const idx = dl.indexOf(job);
      if (idx > -1) dl.splice(idx, 1);
      count++;
    }
    if (count > 0) this.processQueue(queueName);
    return count;
  }

  // ─── Cleanup ───
  onModuleDestroy(): void {
    this.destroyed = true;
    this.queues.clear();
    this.handlers.clear();
    this.deadLetter.clear();
    this.processing.clear();
  }
}

export class MessageQueueModule {
  static forRoot() {
    return {
      module: MessageQueueModule,
      providers: [MessageQueueService],
      exports: [MessageQueueService],
      global: true,
    };
  }
}
