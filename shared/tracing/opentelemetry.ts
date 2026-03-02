// Rasid v6.4 — Distributed Tracing — E1 Fix
// OpenTelemetry setup for request tracing across modules
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  startTime: number;
  attributes: Record<string, string>;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private activeSpans = new Map<string, TraceContext>();

  /**
   * E1: Create new trace for incoming request
   */
  startTrace(req: Request): TraceContext {
    const traceId = req.headers['x-trace-id'] as string || this.generateId(32);
    const spanId = this.generateId(16);
    const parentSpanId = req.headers['x-parent-span-id'] as string;

    const ctx: TraceContext = {
      traceId, spanId, parentSpanId, sampled: true,
      startTime: Date.now(),
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'tenant.id': (req as any).tenantContext?.tenantId || 'unknown',
        'service.name': 'rasid-platform',
      },
    };

    this.activeSpans.set(spanId, ctx);
    return ctx;
  }

  /**
   * Create child span for internal operations
   */
  startSpan(parentCtx: TraceContext, operationName: string): TraceContext {
    const spanId = this.generateId(16);
    const ctx: TraceContext = {
      traceId: parentCtx.traceId,
      spanId,
      parentSpanId: parentCtx.spanId,
      sampled: parentCtx.sampled,
      startTime: Date.now(),
      attributes: { 'operation.name': operationName },
    };

    this.activeSpans.set(spanId, ctx);
    return ctx;
  }

  /**
   * End span and record duration
   */
  endSpan(ctx: TraceContext): { duration: number } {
    const duration = Date.now() - ctx.startTime;
    this.activeSpans.delete(ctx.spanId);
    
    // In production: export to Jaeger/Zipkin/OTLP collector
    if (duration > 1000) {
      this.logger.warn(`Slow span: ${ctx.attributes['operation.name'] || ctx.attributes['http.url']} took ${duration}ms [trace=${ctx.traceId}]`);
    }

    return { duration };
  }

  /**
   * Get trace headers for outgoing requests
   */
  getTraceHeaders(ctx: TraceContext): Record<string, string> {
    return {
      'x-trace-id': ctx.traceId,
      'x-span-id': ctx.spanId,
      'x-parent-span-id': ctx.spanId,
      'traceparent': `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? '01' : '00'}`,
    };
  }

  private generateId(length: number): string {
    const bytes = new Uint8Array(length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
}

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(private readonly tracing: TracingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const ctx = this.tracing.startTrace(req);
    (req as any).traceContext = ctx;

    res.setHeader('x-trace-id', ctx.traceId);
    res.setHeader('x-span-id', ctx.spanId);

    res.on('finish', () => {
      ctx.attributes['http.status_code'] = res.statusCode.toString();
      this.tracing.endSpan(ctx);
    });

    next();
  }
}
