// Rasid v6.4 — Prometheus Metrics — E2/OBS-001 Fix
import { Injectable, Logger } from '@nestjs/common';

export interface PlatformMetrics {
  requestCount: number;
  errorCount: number;
  activeConnections: number;
  avgResponseTimeMs: number;
  cacheHitRate: number;
  eventQueueDepth: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  tenantCount: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private requestCount = 0;
  private errorCount = 0;
  private activeConnections = 0;
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_SAMPLES = 1000;

  recordRequest(durationMs: number, isError: boolean = false): void {
    this.requestCount++;
    if (isError) this.errorCount++;
    this.responseTimes.push(durationMs);
    if (this.responseTimes.length > this.MAX_RESPONSE_SAMPLES) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  incrementConnections(): void { this.activeConnections++; }
  decrementConnections(): void { this.activeConnections = Math.max(0, this.activeConnections - 1); }

  getMetrics(): PlatformMetrics {
    const mem = process.memoryUsage();
    const avgResponse = this.responseTimes.length > 0
      ? this.responseTimes.reduce((s, v) => s + v, 0) / this.responseTimes.length : 0;

    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      activeConnections: this.activeConnections,
      avgResponseTimeMs: Math.round(avgResponse * 100) / 100,
      cacheHitRate: 0, // Will be populated by cache layer
      eventQueueDepth: 0, // Will be populated by event bus
      memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
      cpuUsagePercent: 0, // OS-level metric
      tenantCount: 0, // Will be populated by tenant service
    };
  }

  // Prometheus-compatible text format
  toPrometheusFormat(): string {
    const m = this.getMetrics();
    return [
      '# HELP rasid_request_total Total HTTP requests',
      '# TYPE rasid_request_total counter',
      `rasid_request_total ${m.requestCount}`,
      '# HELP rasid_error_total Total errors',
      '# TYPE rasid_error_total counter',
      `rasid_error_total ${m.errorCount}`,
      '# HELP rasid_active_connections Active connections',
      '# TYPE rasid_active_connections gauge',
      `rasid_active_connections ${m.activeConnections}`,
      '# HELP rasid_response_time_ms Average response time',
      '# TYPE rasid_response_time_ms gauge',
      `rasid_response_time_ms ${m.avgResponseTimeMs}`,
      '# HELP rasid_memory_usage_mb Heap memory usage',
      '# TYPE rasid_memory_usage_mb gauge',
      `rasid_memory_usage_mb ${m.memoryUsageMb}`,
    ].join('\n');
  }
}
