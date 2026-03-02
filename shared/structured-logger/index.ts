// D4 FIX: Structured Logging (Pino-compatible JSON output)
import { LoggerService, Injectable, Scope } from '@nestjs/common';

export interface LogEntry { ts: string; level: string; msg: string; svc?: string; cid?: string; tid?: string; dur?: number; err?: { msg: string; stack?: string }; meta?: Record<string, unknown>; }

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private ctx = 'App';
  private cid?: string;
  private tid?: string;

  setContext(c: string) { this.ctx = c; }
  setCorrelationId(id: string) { this.cid = id; }
  setTenantId(id: string) { this.tid = id; }

  log(msg: string, ...m: unknown[]) { this.write('info', msg, m); }
  error(msg: string, trace?: string, ...m: unknown[]) { this.write('error', msg, m, trace); }
  warn(msg: string, ...m: unknown[]) { this.write('warn', msg, m); }
  debug(msg: string, ...m: unknown[]) { this.write('debug', msg, m); }
  verbose(msg: string, ...m: unknown[]) { this.write('trace', msg, m); }

  private write(level: string, msg: string, meta: unknown[], trace?: string) {
    const e: LogEntry = { ts: new Date().toISOString(), level, msg, svc: this.ctx, cid: this.cid, tid: this.tid };
    if (trace) e.err = { msg, stack: trace };
    if (meta.length > 0 && typeof meta[0] === 'object') e.meta = meta[0] as Record<string, unknown>;
    const out = JSON.stringify(e);
    if (level === 'error') process.stderr.write(out + '\n');
    else process.stdout.write(out + '\n');
  }

  startTimer(): () => number {
    const s = process.hrtime.bigint();
    return () => Number(process.hrtime.bigint() - s) / 1e6;
  }
}
