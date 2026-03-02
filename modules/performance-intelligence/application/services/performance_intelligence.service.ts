// Rasid v6.4 — Performance Intelligence — Section 8
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkloadPredictionEngine } from '../../../../shared/workload-prediction';
import { CircuitBreaker } from '../../../../shared/circuit-breaker';


@Injectable()
export class PerformanceIntelligenceService {
  private readonly breaker = new CircuitBreaker('PerformanceIntelligenceService', 5, 30000);

  private safeEmit(event: string, data: unknown): void { try { this.events.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(PerformanceIntelligenceService.name);
  private readonly workloadEngine = new WorkloadPredictionEngine();
  private metricsHistory: Array<{ timestamp: number; cpu: number; memory: number; gpu: number; latency: number }> = [];
  private readonly MAX_HISTORY = 1000;
  private readonly AVAILABLE_CPU = 64; private readonly AVAILABLE_MEM = 131072; private readonly AVAILABLE_GPU = 8;

  private readonly workloadPredictionEngine = new WorkloadPredictionEngine();

  constructor(
    @InjectRepository(require('../../domain/entities/performance_intelligence.entity').PerformanceIntelligenceEntity, 'performance_intelligence_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  recordMetrics(cpu: number, memory: number, gpu: number, latency: number) {
    const entry = { timestamp: Date.now(), cpu, memory, gpu, latency };
    this.metricsHistory.push(entry);
    if (this.metricsHistory.length > this.MAX_HISTORY) this.metricsHistory = this.metricsHistory.slice(-500);
    // Feed workload prediction engine
    this.workloadEngine.record({ timestamp: entry.timestamp, cpu, memory, gpu, latency });
  }

  // Section 8.1: Resource-Aware Execution
  distributeTasks(tasks: Array<{ id: string; cpuNeeded: number; memNeeded: number; gpuNeeded: number; priority: number }>): Array<{ taskId: string; allocated: boolean; resources: unknown; queue?: number }> {
    const sorted = [...tasks].sort((a, b) => b.priority - a.priority);
    let usedCpu = 0, usedMem = 0, usedGpu = 0;
    return sorted.map((task, idx) => {
      const canAllocate = (usedCpu + task.cpuNeeded <= this.AVAILABLE_CPU) && (usedMem + task.memNeeded <= this.AVAILABLE_MEM) && (usedGpu + task.gpuNeeded <= this.AVAILABLE_GPU);
      if (canAllocate) {
        usedCpu += task.cpuNeeded; usedMem += task.memNeeded; usedGpu += task.gpuNeeded;
        return { taskId: task.id, allocated: true, resources: { cpu: task.cpuNeeded, memory: task.memNeeded, gpu: task.gpuNeeded } };
      }
      return { taskId: task.id, allocated: false, resources: null, queue: idx };
    });
  }

  // Section 8.1: Bottleneck detection
  detectBottlenecks(): Array<{ resource: string; utilization: number; recommendation: string }> {
    if (this.metricsHistory.length < 5) return [];
    const recent = this.metricsHistory.slice(-20);
    const avgCpu = recent.reduce((s, m) => s + m.cpu, 0) / recent.length;
    const avgMem = recent.reduce((s, m) => s + m.memory, 0) / recent.length;
    const avgGpu = recent.reduce((s, m) => s + m.gpu, 0) / recent.length;
    const avgLat = recent.reduce((s, m) => s + m.latency, 0) / recent.length;
    const bottlenecks: Array<{ resource: string; utilization: number; recommendation: string }> = [];
    if (avgCpu / this.AVAILABLE_CPU > 0.85) bottlenecks.push({ resource: 'cpu', utilization: avgCpu / this.AVAILABLE_CPU, recommendation: 'Scale CPU horizontally or optimize compute-heavy tasks' });
    if (avgMem / this.AVAILABLE_MEM > 0.85) bottlenecks.push({ resource: 'memory', utilization: avgMem / this.AVAILABLE_MEM, recommendation: 'Increase memory allocation or enable memory-efficient processing' });
    if (avgGpu / this.AVAILABLE_GPU > 0.85) bottlenecks.push({ resource: 'gpu', utilization: avgGpu / this.AVAILABLE_GPU, recommendation: 'Queue GPU tasks or enable CPU fallback' });
    if (avgLat > 2000) bottlenecks.push({ resource: 'latency', utilization: avgLat / 2000, recommendation: 'Enable caching or optimize query paths' });
    if (bottlenecks.length > 0) this.safeEmit('perf.bottleneck.detected', { bottlenecks: bottlenecks.map(b => b.resource) });
    return bottlenecks;
  }

  // Section 8.2: Workload Prediction — integrated with shared lib (GAP-07)
  predictWorkload(horizonMinutes: number = 30): { predictedLoad: number; resources: unknown; preWarmTargets: string[] } {
    const prediction = this.workloadEngine.predict(horizonMinutes);
    const preWarmTargets: string[] = [];
    if (prediction.predictedLoad > 0.6) preWarmTargets.push('columnar_cache', 'aggregation_cache');
    if (prediction.predictedLoad > 0.8) preWarmTargets.push('gpu_model_cache', 'query_plan_cache');
    if (preWarmTargets.length > 0) {
      this.safeEmit('perf.prewarm.triggered', { predictedLoad: prediction.predictedLoad, targets: preWarmTargets });
    }
    return { ...prediction, preWarmTargets };
  }

  // GAP-24: Pre-warm cache
  async preWarmCaches(targets: string[]): Promise<{ warmed: string[]; failed: string[] }> {
    const warmed: string[] = [], failed: string[] = [];
    for (const target of targets) {
      try {
        // Signal cache subsystems to pre-warm
        this.logger.log(`Pre-warming cache: ${target}`);
        this.safeEmit('perf.cache.prewarm', { target });
        warmed.push(target);
      } catch { failed.push(target); }
    }
    return { warmed, failed };
  }

  // Scaling recommendation
  getScalingRecommendation(): { action: 'scale_up' | 'scale_down' | 'stable'; details: Record<string, unknown> } {
    const bottlenecks = this.detectBottlenecks();
    if (bottlenecks.length >= 2) {
      this.safeEmit('perf.scaling.recommended', { action: 'scale_up', bottlenecks: bottlenecks.length });
      return { action: 'scale_up', details: { bottlenecks, reason: 'Multiple resources at capacity' } };
    }
    if (this.metricsHistory.length >= 20) {
      const recent = this.metricsHistory.slice(-20);
      const avgUtil = recent.reduce((s, m) => s + m.cpu / this.AVAILABLE_CPU, 0) / recent.length;
      if (avgUtil < 0.2) return { action: 'scale_down', details: { avgUtilization: avgUtil, reason: 'Consistent low utilization' } };
    }
    return { action: 'stable', details: {} };
  }

  async findByTenant(tenantId: string) { return this.breaker.execute(async () => { return this.repo.find({ where: { tenantId });} }); }

// C: Operation rescheduling (Section 8.1)
  rescheduleOperations(tasks: Array<{ id: string; priority: number; cpuNeeded: number; estimatedMs: number; deadline?: number }>): Array<{ id: string; scheduledAt: number; deferred: boolean }> {
    const now = Date.now();
    const sorted = [...tasks].sort((a, b) => {
      // Priority first, then deadline proximity
      if (a.deadline && b.deadline) return (a.deadline - now) - (b.deadline - now);
      return b.priority - a.priority;
    });
    let timeSlot = now;
    return sorted.map(task => {
      const deferred = task.deadline ? timeSlot + task.estimatedMs > task.deadline : false;
      const scheduledAt = timeSlot;
      timeSlot += task.estimatedMs;
      return { id: task.id, scheduledAt, deferred };
    });
  }

  // C: System congestion prevention (Section 8.1)
  preventCongestion(currentLoad: { cpu: number; memory: number; gpu: number; queueDepth: number }): { congested: boolean; actions: string[]; throttleRate: number } {
    const actions: string[] = [];
    let throttleRate = 1.0;
    const cpuUtil = currentLoad.cpu / this.AVAILABLE_CPU;
    const memUtil = currentLoad.memory / this.AVAILABLE_MEM;
    if (cpuUtil > 0.9) { actions.push('Throttle new CPU-intensive tasks'); throttleRate *= 0.5; }
    if (memUtil > 0.9) { actions.push('Evict cold caches to free memory'); throttleRate *= 0.7; }
    if (currentLoad.queueDepth > 100) { actions.push('Reject low-priority tasks'); throttleRate *= 0.3; }
    if (currentLoad.gpu / this.AVAILABLE_GPU > 0.95) { actions.push('Queue GPU tasks, fallback to CPU'); throttleRate *= 0.6; }
    const congested = throttleRate < 0.8;
    if (congested) this.safeEmit('perf.congestion.detected', { actions, throttleRate });
    return { congested, actions, throttleRate };
  }

  // C: Proactive load distribution (FIX ARC-004: uses class-level workloadPredictionEngine singleton)
  getProactiveDistribution(horizonMinutes: number = 30): unknown {
    const prediction = this.predictWorkload(horizonMinutes);
    return this.workloadPredictionEngine.proactiveDistribution(prediction.predictedLoad, 3); // 3 nodes default
  }
}
