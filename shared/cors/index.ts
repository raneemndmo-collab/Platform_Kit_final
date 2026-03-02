/**
 * SEC-007: CORS Configuration
 * ────────────────────────────────────────────────────────
 * Production-grade CORS with allowlist, wildcard subdomain
 * support, and configurable per-environment settings.
 */
import { Injectable, Logger } from '@nestjs/common';

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

@Injectable()
export class CorsConfigService {
  private readonly logger = new Logger(CorsConfigService.name);
  private readonly allowedPatterns: RegExp[];

  constructor() {
    this.allowedPatterns = this.buildPatterns();
  }

  private buildPatterns(): RegExp[] {
    const envPatterns = process.env['CORS_ORIGIN_PATTERNS']?.split(',') ?? [];
    const defaults = [
      /^https:\/\/.*\.rasid\.ndmo\.gov\.sa$/,
      /^https:\/\/rasid\.ndmo\.gov\.sa$/,
    ];
    const custom = envPatterns
      .filter(Boolean)
      .map(p => new RegExp(p.trim()));
    return [...defaults, ...custom];
  }

  getConfig(): CorsConfig {
    const envOrigins = process.env['CORS_ALLOWED_ORIGINS'] ?? '';
    const origins = envOrigins
      ? envOrigins.split(',').map(o => o.trim()).filter(Boolean)
      : ['https://rasid.ndmo.gov.sa', 'https://admin.rasid.ndmo.gov.sa'];

    if (process.env['NODE_ENV'] !== 'production') {
      origins.push('http://localhost:3000', 'http://localhost:4200', 'http://localhost:5173');
    }

    return {
      allowedOrigins: origins,
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Tenant-Name',
        'X-Tenant-Tier', 'X-Request-Id', 'X-Correlation-Id',
        'Accept-Language', 'X-API-Version', 'X-Idempotency-Key',
      ],
      exposedHeaders: [
        'X-Request-Id', 'X-Correlation-Id',
        'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset',
        'X-Total-Count', 'X-Page-Count', 'X-API-Version',
      ],
      maxAge: 86400,
      credentials: true,
    };
  }

  isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true; // Same-origin requests
    const config = this.getConfig();
    if (config.allowedOrigins.includes(origin)) return true;
    if (config.allowedOrigins.includes('*')) return true;
    return this.allowedPatterns.some(pattern => pattern.test(origin));
  }

  getNestCorsOptions(): Record<string, unknown> {
    const config = this.getConfig();
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (this.isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          this.logger.warn(`CORS blocked: ${origin}`);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      methods: config.allowedMethods,
      allowedHeaders: config.allowedHeaders,
      exposedHeaders: config.exposedHeaders,
      maxAge: config.maxAge,
      credentials: config.credentials,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }
}
