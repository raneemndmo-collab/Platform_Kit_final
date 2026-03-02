// Rasid v6.4 — Distributed Tracing — E1 Fix
import { Injectable, Logger } from '@nestjs/common';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  status: 'ok' | 'error' | 'timeout';
  attributes: Record<string, string | number>;
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, any> }>;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private spans: TraceSpan[] = [];
  private readonly MAX_SPANS = 10000;

  startSpan(operationName: string, parentSpanId?: string): TraceSpan {
    const span: TraceSpan = {
      traceId: parentSpanId ? this.findTrace(parentSpanId) : this.generateId(),
      spanId: this.generateId(),
      parentSpanId,
      operationName,
      serviceName: 'rasid-platform',
      startTime: Date.now(),
      status: 'ok',
      attributes: {},
      events: [],
    };

    this.spans.push(span);
    if (this.spans.length > this.MAX_SPANS) {
      this.spans = this.spans.slice(-Math.floor(this.MAX_SPANS * 0.75));
    }
    return span;
  }

  endSpan(spanId: string, status: TraceSpan['status'] = 'ok'): void {
    const span = this.spans.find(s => s.spanId === spanId);
    if (span) {
      span.endTime = Date.now();
      span.status = status;
    }
  }

  addEvent(spanId: string, name: string, attributes?: Record<string, any>): void {
    const span = this.spans.find(s => s.spanId === spanId);
    if (span) {
      span.events.push({ name, timestamp: Date.now(), attributes });
    }
  }

  setAttribute(spanId: string, key: string, value: string | number): void {
    const span = this.spans.find(s => s.spanId === spanId);
    if (span) span.attributes[key] = value;
  }

  getTrace(traceId: string): TraceSpan[] {
    return this.spans.filter(s => s.traceId === traceId);
  }

  // Export in OpenTelemetry-compatible format
  exportSpans(): Array<Record<string, any>> {
    return this.spans
      .filter(s => s.endTime)
      .map(s => ({
        traceId: s.traceId,
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        name: s.operationName,
        kind: 'INTERNAL',
        startTimeUnixNano: s.startTime * 1_000_000,
        endTimeUnixNano: (s.endTime || Date.now()) * 1_000_000,
        attributes: Object.entries(s.attributes).map(([k, v]) => ({
          key: k, value: { stringValue: String(v) },
        })),
        status: { code: s.status === 'ok' ? 1 : 2 },
      }));
  }

  private findTrace(spanId: string): string {
    const span = this.spans.find(s => s.spanId === spanId);
    return span?.traceId || this.generateId();
  }

  private generateId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}
