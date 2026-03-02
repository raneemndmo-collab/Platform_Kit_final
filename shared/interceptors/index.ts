// =============================================================================
import { BoundedMap } from '../bounded-collections';
// Shared Interceptors
// B3: Safe Event Emit (149+ events without error handling)
// GOV-001: Audit Interceptor with hash chain
// E1: Distributed Tracing Interceptor (OpenTelemetry-compatible)
// E3/DEP-001: Graceful Shutdown Service
// D4: Structured Logging helpers
// =============================================================================

import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

// ─── B3 FIX: Safe Event Emitter ──────────────────────────────
@Injectable()
export class SafeEventEmitter {
  private readonly logger = new Logger(SafeEventEmitter.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /** Emit event safely — never throws, always logs errors */
  emit(event: string, data: unknown): boolean {
    try {
      return this.eventEmitter.emit(event, data);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'safe_emit_failed', emittedEvent: event,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return false;
    }
  }

  /** Emit multiple events safely */
  emitMany(events: Array<{ event: string; data: unknown }>): void {
    for (const { event, data } of events) {
      this.emit(event, data);
    }
  }
}

// ─── Audit Log Interceptor (GOV-001: with hash chain) ────────
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);
  private lastHash = 'GENESIS';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    const user = (request as any).user;
    const correlationId = request.headers['x-correlation-id'] || crypto.randomUUID();

    return next.handle().pipe(
      tap((responseData) => {
        const entry = {
          timestamp: new Date().toISOString(),
          correlationId,
          tenantId: request.tenantContext?.tenantId,
          userId: user?.sub,
          method: request.method,
          path: request.url,
          statusCode: context.switchToHttp().getResponse().statusCode,
          durationMs: Date.now() - now,
          previousHash: this.lastHash,
        };
        // Hash chain: each entry includes hash of previous (GOV-001)
        this.lastHash = crypto.createHash('sha256')
          .update(JSON.stringify(entry) + this.lastHash)
          .digest('hex').slice(0, 16);
        
        this.logger.log(JSON.stringify({ ...entry, hash: this.lastHash }));
      }),
      catchError((error) => {
        this.logger.error(JSON.stringify({
          event: 'request_error', correlationId,
          tenantId: request.tenantContext?.tenantId,
          userId: user?.sub, method: request.method, path: request.url,
          error: error?.message, durationMs: Date.now() - now,
        }));
        throw error;
      }),
    );
  }
}

// ─── E1: Distributed Tracing Interceptor ─────────────────────
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const traceId = request.headers['x-trace-id'] || crypto.randomUUID();
    const spanId = crypto.randomUUID().slice(0, 16);
    const parentSpanId = request.headers['x-span-id'];

    // Propagate trace context
    const response = context.switchToHttp().getResponse();
    response.setHeader('x-trace-id', traceId);
    response.setHeader('x-span-id', spanId);

    const startTime = process.hrtime.bigint();
    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;

    return next.handle().pipe(
      tap(() => {
        const durationNs = Number(process.hrtime.bigint() - startTime);
        this.logger.debug(JSON.stringify({
          event: 'span_end', traceId, spanId, parentSpanId,
          handler: handlerName, durationMs: (durationNs / 1_000_000).toFixed(2),
          status: 'OK',
        }));
      }),
      catchError((error) => {
        const durationNs = Number(process.hrtime.bigint() - startTime);
        this.logger.error(JSON.stringify({
          event: 'span_error', traceId, spanId, parentSpanId,
          handler: handlerName, durationMs: (durationNs / 1_000_000).toFixed(2),
          status: 'ERROR', error: error?.message,
        }));
        throw error;
      }),
    );
  }
}

// ─── E3/DEP-001: Graceful Shutdown ───────────────────────────
@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly shutdownCallbacks: Array<() => Promise<void>> = [];

  registerShutdownCallback(fn: () => Promise<void>): void {
    this.shutdownCallbacks.push(fn);
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.warn(`Application shutting down (signal: ${signal})`);

    // Drain all registered callbacks with timeout
    const timeout = 30_000;
    const shutdownPromise = Promise.allSettled(
      this.shutdownCallbacks.map(cb =>
        Promise.race([
          cb(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Shutdown callback timeout')), timeout)
          ),
        ])
      )
    );

    const results = await shutdownPromise;
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.error(`${failed.length} shutdown callbacks failed`);
    }
    this.logger.log('Graceful shutdown complete');
  }
}

// ─── OBS-001: Prometheus Metrics Service ─────────────────────
@Injectable()
export class MetricsService {
  private readonly counters = new BoundedMap<string, number>(10_000);
  private readonly histograms = new BoundedMap<string, number[]>(10_000);
  private readonly gauges = new BoundedMap<string, number>(10_000);

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    if (values.length > 10_000) values.splice(0, values.length - 5_000);
    this.histograms.set(key, values);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(this.buildKey(name, labels), value);
  }

  /** Prometheus-compatible text output */
  getMetricsText(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters) {
      lines.push(`rasid_${key} ${value}`);
    }
    for (const [key, value] of this.gauges) {
      lines.push(`rasid_${key} ${value}`);
    }
    for (const [key, values] of this.histograms) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((s, v) => s + v, 0);
      lines.push(`rasid_${key}_count ${sorted.length}`);
      lines.push(`rasid_${key}_sum ${sum.toFixed(4)}`);
      lines.push(`rasid_${key}{quantile="0.5"} ${sorted[Math.floor(sorted.length * 0.5)]?.toFixed(4)}`);
      lines.push(`rasid_${key}{quantile="0.95"} ${sorted[Math.floor(sorted.length * 0.95)]?.toFixed(4)}`);
      lines.push(`rasid_${key}{quantile="0.99"} ${sorted[Math.floor(sorted.length * 0.99)]?.toFixed(4)}`);
    }
    return lines.join('\n');
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
  }
}
