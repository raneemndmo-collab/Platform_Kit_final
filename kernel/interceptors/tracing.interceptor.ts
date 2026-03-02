/**
 * ═══════════════════════════════════════════════════════════════════════
 * RASID v6.2 Tracing Interceptor
 * Rule: SRE-008 (Structured JSON Logging), FP-050 (PII Sanitization)
 * Impact on existing code: ZERO — Global NestJS interceptor wraps requests
 * ═══════════════════════════════════════════════════════════════════════
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { randomBytes } from 'crypto';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    // Extract or generate W3C Trace Context
    const traceId = req.headers?.['traceparent']
      ? this.parseTraceParent(req.headers['traceparent'])
      : this.generateTraceId();
    const spanId = this.generateSpanId();

    // Attach to request for downstream propagation
    req['trace_id'] = traceId;
    req['span_id'] = spanId;

    const start = Date.now();

    return next.handle().pipe(
      tap(() => this.log('INFO', context, req, traceId, spanId, start)),
      catchError(err => {
        this.log('ERROR', context, req, traceId, spanId, start, err);
        throw err;
      })
    );
  }

  private log(
    level: string,
    context: ExecutionContext,
    req: Record<string, unknown>,
    traceId: string,
    spanId: string,
    start: number,
    error?: unknown
  ): void {
    // Skip structured logging in test environment
    if (process.env.NODE_ENV === 'test') return;

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      trace_id: traceId,
      span_id: spanId,
      service: context.getClass()?.name || 'unknown',
      method: context.getHandler()?.name || 'unknown',
      module_id: this.extractModuleId(context),
      tenant_id: req['tenantId'] || req.headers?.['x-tenant-id'] || null,
      http_method: req.method,
      path: req.url,
      message: `${req.method} ${req.url} ${level === 'ERROR' ? 'FAILED' : 'OK'}`,
      duration_ms: Date.now() - start,
      status_code: error ? (error.status || 500) : 200,
    };

    // Add error details (sanitized — FP-050 compliant)
    if (error) {
      entry.error = {
        code: error.code || 'UNKNOWN',
        message: this.sanitize(error.message || 'Unknown error'),
        // No stack trace in production (SRE-010)
      };
    }

    // Output structured JSON to stdout (SRE-008)
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  /**
   * PII Sanitization (FP-050, DGP-008)
   * Masks: emails, phone numbers, national IDs, tokens, passwords
   */
  private sanitize(text: string): string {
    if (!text) return text;
    return text
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '***@***.***')                    // emails
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****')        // phone numbers
      .replace(/\b[A-Z]{2}\d{8,}\b/g, '****')                             // national IDs
      .replace(/(token|password|secret|api_key|apiKey)[:=]\s*\S+/gi, '$1=[REDACTED]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****'); // credit cards
  }

  /**
   * Extract module ID from controller class name convention
   * e.g., HrmController → M1, FinanceController → M2
   */
  private extractModuleId(context: ExecutionContext): string {
    const className = context.getClass()?.name || '';
    // Module controllers follow naming pattern: M{n}{Name}Controller
    const match = className.match(/^(M\d+|K\d+)/i);
    return match ? match[1].toUpperCase() : className.replace('Controller', '');
  }

  /**
   * W3C Trace Context parsing
   * Format: version-trace_id-parent_id-trace_flags
   * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
   */
  private parseTraceParent(header: string): string {
    const parts = header.split('-');
    return parts.length >= 2 ? parts[1] : this.generateTraceId();
  }

  private generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }
}

export { TracingInterceptor };
