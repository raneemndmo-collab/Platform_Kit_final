// Rasid v6.4 — Structured Logging Interceptor — D4 Fix
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    const startTime = Date.now();
    const { method, url } = request;
    const tenantId = request.tenantContext?.tenantId || 'unknown';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(JSON.stringify({
          event: 'request.completed', correlationId, method, url, tenantId,
          duration, statusCode: context.switchToHttp().getResponse().statusCode,
          timestamp: new Date().toISOString(),
        }));
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(JSON.stringify({
          event: 'request.failed', correlationId, method, url, tenantId,
          duration, error: error.message, stack: error.stack?.slice(0, 200),
          timestamp: new Date().toISOString(),
        }));
        return throwError(() => error);
      }),
    );
  }
}
