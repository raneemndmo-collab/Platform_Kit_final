// Rasid v6.4 — Input Sanitization — SEC-005 Fix
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InputSanitizationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InputSanitizationMiddleware.name);
  private readonly MAX_STRING_LENGTH = 10000;
  private readonly MAX_ARRAY_LENGTH = 1000;
  private readonly MAX_DEPTH = 10;

  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitize(req.body, 0);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitize(req.query, 0) as any;
    }
    next();
  }

  private sanitize(obj: unknown, depth: number): unknown {
    if (depth > this.MAX_DEPTH) return {};

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.slice(0, this.MAX_ARRAY_LENGTH).map(item => this.sanitize(item, depth + 1));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Reject keys with special characters (SQL injection, NoSQL injection)
        if (/^[a-zA-Z0-9_.-]+$/.test(key)) {
          result[key] = this.sanitize(value, depth + 1);
        } else {
          this.logger.warn(`Rejected suspicious key: ${key.slice(0, 50)}`);
        }
      }
      return result;
    }
    return obj;
  }

  private sanitizeString(str: string): string {
    // Truncate overly long strings
    let s = str.slice(0, this.MAX_STRING_LENGTH);
    // Remove null bytes
    s = s.replace(/\0/g, '');
    // Basic XSS prevention for stored content
    s = s.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '');
    return s;
  }
}
