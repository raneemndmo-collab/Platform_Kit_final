// M26: Scheduler - Application Service
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { ScheduledJob, JobExecution, JobQueue } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(ScheduledJob, 'm26_connection') private jobRepo: Repository<ScheduledJob>,
    @InjectRepository(JobExecution, 'm26_connection') private execRepo: Repository<JobExecution>,
    @InjectRepository(JobQueue, 'm26_connection') private queueRepo: Repository<JobQueue>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Job Management ===
  async createJob(tenantId: string, data: {
    name: string; jobType: string; targetModule: string; targetAction: string;
    cronExpression?: string; intervalSeconds?: number; payload?: unknown;
    priority?: string; maxRetries?: number; timeoutSeconds?: number;
  }): Promise<ScheduledJob> {
    if (data.jobType === 'cron' && !data.cronExpression)
      throw new BadRequestException('Cron expression required for cron jobs');

    const nextRunAt = this.calculateNextRun(data.jobType, data.cronExpression, data.intervalSeconds);
    const job = await this.jobRepo.save(this.jobRepo.create({ tenantId, ...data, nextRunAt }));
    this.safeEmit('scheduler.job.created', { tenantId, jobId: job.id, name: data.name });
    return job;
  }

  async updateJob(tenantId: string, jobId: string, data: Partial<ScheduledJob>): Promise<ScheduledJob> {
    await this.jobRepo.update({ id: jobId, tenantId }, data);
    return this.jobRepo.findOneOrFail({ where: { id: jobId, tenantId } });
  }

  async pauseJob(tenantId: string, jobId: string): Promise<void> {
    await this.jobRepo.update({ id: jobId, tenantId }, { status: 'paused' });
    this.safeEmit('scheduler.job.paused', { tenantId, jobId });
  }

  async resumeJob(tenantId: string, jobId: string): Promise<void> {
    const job = await this.jobRepo.findOneOrFail({ where: { id: jobId, tenantId } });
    const nextRunAt = this.calculateNextRun(job.jobType, job.cronExpression, job.intervalSeconds);
    await this.jobRepo.update({ id: jobId, tenantId }, { status: 'active', nextRunAt });
    this.safeEmit('scheduler.job.resumed', { tenantId, jobId });
  }

  async deleteJob(tenantId: string, jobId: string): Promise<void> {
    await this.jobRepo.update({ id: jobId, tenantId }, { status: 'disabled' });
  }

  async getJob(tenantId: string, jobId: string): Promise<ScheduledJob> {
    return this.jobRepo.findOneOrFail({ where: { id: jobId, tenantId } });
  }

  async listJobs(tenantId: string, status?: string): Promise<ScheduledJob[]> {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.jobRepo.find({ where, order: { nextRunAt: 'ASC' } });
  }

  // === Execution Engine ===
  async pollAndExecute(workerId: string): Promise<JobExecution | null> {
    // Find due jobs with no lock
    const now = new Date();
    const dueJobs = await this.jobRepo.find({
      where: { status: 'active', nextRunAt: LessThanOrEqual(now) },
      order: { priority: 'ASC', nextRunAt: 'ASC' }, take: 1,
    });

    if (dueJobs.length === 0) return null;
    const job = dueJobs[0];

    // Acquire distributed lock
    const lockId = crypto.randomUUID();
    const lockExpiry = new Date(Date.now() + job.timeoutSeconds * 1000);
    const lockResult = await this.jobRepo.update(
      { id: job.id, lockId: IsNull() },
      { lockId, lockExpiresAt: lockExpiry },
    );
    if (!lockResult.affected) return null; // Another worker grabbed it

    // Create execution record
    const execCount = await this.execRepo.count({ where: { jobId: job.id } });
    const execution = await this.execRepo.save(this.execRepo.create({
      tenantId: job.tenantId, jobId: job.id, executionNumber: execCount + 1,
      status: 'running', workerId, startedAt: now,
    }));

    this.safeEmit('scheduler.job.started', { tenantId: job.tenantId, jobId: job.id, executionId: execution.id });
    return execution;
  }

  async completeExecution(executionId: string, result: { status: 'completed' | 'failed'; result?: unknown; errorMessage?: string }): Promise<void> {
    const now = new Date();
    const execution = await this.execRepo.findOneOrFail({ where: { id: executionId } });
    const durationMs = now.getTime() - execution.startedAt.getTime();

    await this.execRepo.update(executionId, {
      status: result.status, completedAt: now, durationMs,
      result: result.result, errorMessage: result.errorMessage,
    });

    const job = await this.jobRepo.findOneOrFail({ where: { id: execution.jobId } });

    if (result.status === 'failed' && job.retryCount < job.maxRetries) {
      await this.jobRepo.update(job.id, {
        retryCount: job.retryCount + 1, lockId: null as any, lockExpiresAt: null as any,
        nextRunAt: new Date(Date.now() + Math.pow(2, job.retryCount) * 5000),
      });
    } else {
      const nextRunAt = job.jobType === 'one_time' ? null : this.calculateNextRun(job.jobType, job.cronExpression, job.intervalSeconds);
      const status = job.jobType === 'one_time' ? 'completed' : 'active';
      await this.jobRepo.update(job.id, {
        lastRunAt: now, lastRunStatus: result.status, retryCount: 0,
        lockId: null as any, lockExpiresAt: null as any, nextRunAt, status,
      });
    }

    this.safeEmit(`scheduler.job.${result.status}`, { tenantId: job.tenantId, jobId: job.id, executionId });
  }

  // === Execution History ===
  async getExecutions(tenantId: string, jobId: string): Promise<JobExecution[]> {
    return this.execRepo.find({ where: { tenantId, jobId }, order: { startedAt: 'DESC' }, take: 50 });
  }

  // === Queue Management ===
  async createQueue(tenantId: string, data: { queueName: string; concurrency?: number }): Promise<JobQueue> {
    return this.queueRepo.save(this.queueRepo.create({ tenantId, ...data }));
  }

  async listQueues(tenantId: string): Promise<JobQueue[]> {
    return this.queueRepo.find({ where: { tenantId } });
  }

  // === Helpers ===
  private calculateNextRun(jobType: string, cronExpression?: string, intervalSeconds?: number): Date {
    const now = new Date();
    if (jobType === 'interval' && intervalSeconds) {
      return new Date(now.getTime() + intervalSeconds * 1000);
    }
    if (jobType === 'cron' && cronExpression) {
      // Simplified: next minute for demo. Real implementation would parse cron.
      return new Date(now.getTime() + 60000);
    }
    return now;
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.jobRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
