// ═══════════════════════════════════════════════════════════════════════════════
// محرك خط أنابيب البيانات — Data Pipeline Engine
// رصيد v6.4 — ETL/ELT مع عزل المستأجر وميزانية الذاكرة
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';
import { CircuitBreaker } from '../../circuit-breaker';

export type StageType = 'source' | 'transform' | 'filter' | 'aggregate' | 'join' | 'sink' | 'validate';

export interface PipelineStage {
  id: string;
  type: StageType;
  name: string;
  config: Record<string, unknown>;
  retryPolicy?: { maxRetries: number; backoffMs: number };
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  stages: PipelineStage[];
  schedule?: string;
  memoryBudgetMB: number;
  timeoutMs: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  lastRunAt?: Date;
  metrics: { recordsProcessed: number; bytesProcessed: number; errorsCount: number; durationMs: number };
}

export interface PipelineRunResult {
  pipelineId: string;
  tenantId: string;
  status: 'completed' | 'failed' | 'timeout';
  stageResults: Array<{ stageId: string; status: string; recordsIn: number; recordsOut: number; durationMs: number }>;
  totalDurationMs: number;
  totalRecords: number;
}

@Injectable()
export class DataPipelineEngine {
  private readonly logger = new Logger(DataPipelineEngine.name);
  private readonly breaker = new CircuitBreaker('data-pipeline', 5, 30000);
  private readonly pipelines = new BoundedMap<string, Pipeline[]>(5000);
  private readonly runHistory = new BoundedMap<string, PipelineRunResult[]>(10000);
  private readonly MEMORY_BUDGET_MB = 512;

  registerPipeline(pipeline: Pipeline): Pipeline {
    this.logger.log(`تسجيل خط أنابيب: ${pipeline.name} tenant=${pipeline.tenantId}`);
    pipeline.memoryBudgetMB = Math.min(pipeline.memoryBudgetMB, this.MEMORY_BUDGET_MB);
    const tenantPipelines = this.pipelines.get(pipeline.tenantId) || [];
    tenantPipelines.push(pipeline);
    this.pipelines.set(pipeline.tenantId, tenantPipelines);
    return pipeline;
  }

  async runPipeline(tenantId: string, pipelineId: string, data: Record<string, unknown>[]): Promise<PipelineRunResult> {
    const pipelines = this.pipelines.get(tenantId) || [];
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) throw new Error(`خط أنابيب غير موجود: ${pipelineId}`);

    return this.breaker.execute(async () => {
      const startTime = Date.now();
      pipeline.status = 'running';
      pipeline.lastRunAt = new Date();
      const stageResults: PipelineRunResult['stageResults'] = [];
      let currentData = [...data];

      for (const stage of pipeline.stages) {
        const stageStart = Date.now();
        const inputCount = currentData.length;
        try {
          currentData = await this.executeStage(stage, currentData, pipeline.memoryBudgetMB);
          stageResults.push({
            stageId: stage.id, status: 'completed',
            recordsIn: inputCount, recordsOut: currentData.length,
            durationMs: Date.now() - stageStart,
          });
        } catch (error: any) {
          stageResults.push({
            stageId: stage.id, status: 'failed',
            recordsIn: inputCount, recordsOut: 0,
            durationMs: Date.now() - stageStart,
          });
          pipeline.status = 'failed';
          break;
        }

        if (Date.now() - startTime > pipeline.timeoutMs) {
          pipeline.status = 'failed';
          return { pipelineId, tenantId, status: 'timeout', stageResults, totalDurationMs: Date.now() - startTime, totalRecords: currentData.length };
        }
      }

      pipeline.status = pipeline.status === 'failed' ? 'failed' : 'completed';
      pipeline.metrics = {
        recordsProcessed: currentData.length,
        bytesProcessed: JSON.stringify(currentData).length,
        errorsCount: stageResults.filter(s => s.status === 'failed').length,
        durationMs: Date.now() - startTime,
      };

      const result: PipelineRunResult = {
        pipelineId, tenantId,
        status: pipeline.status === 'completed' ? 'completed' : 'failed',
        stageResults, totalDurationMs: Date.now() - startTime,
        totalRecords: currentData.length,
      };

      const history = this.runHistory.get(`${tenantId}:${pipelineId}`) || [];
      history.push(result);
      if (history.length > 50) history.shift();
      this.runHistory.set(`${tenantId}:${pipelineId}`, history);
      return result;
    });
  }

  private async executeStage(stage: PipelineStage, data: Record<string, unknown>[], memoryBudgetMB: number): Promise<Record<string, unknown>[]> {
    const estimatedMB = JSON.stringify(data).length / (1024 * 1024);
    if (estimatedMB > memoryBudgetMB) {
      this.logger.warn(`تجاوز ميزانية الذاكرة: ${estimatedMB}MB > ${memoryBudgetMB}MB`);
      data = data.slice(0, Math.floor(data.length * (memoryBudgetMB / estimatedMB)));
    }

    switch (stage.type) {
      case 'filter':
        return data.filter(row => {
          const field = String(stage.config.field);
          const value = stage.config.value;
          return row[field] === value;
        });
      case 'transform':
        return data.map(row => ({ ...row, _transformed: true, _stage: stage.name }));
      case 'aggregate':
        return [{ _aggregated: true, count: data.length, stage: stage.name }];
      case 'validate':
        return data.filter(row => Object.keys(row).length > 0);
      default:
        return data;
    }
  }

  getPipelines(tenantId: string): Pipeline[] {
    return this.pipelines.get(tenantId) || [];
  }

  getRunHistory(tenantId: string, pipelineId: string): PipelineRunResult[] {
    return this.runHistory.get(`${tenantId}:${pipelineId}`) || [];
  }
}
