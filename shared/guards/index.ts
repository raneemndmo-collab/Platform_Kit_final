// =============================================================================
import { BoundedMap } from '../bounded-collections';
// Tenant Guard — Ensures tenantId is present and valid
// Role Guard — RBAC enforcement at controller/method level
// Rate Limiter — SEC-010: DoS protection
// =============================================================================

import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
  SetMetadata, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// ─── Tenant Guard ─────────────────────────────────────────────
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantContext?.tenantId || (request as any).user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('FP-011 VIOLATION: Tenant context required for all operations.');
    }
    return true;
  }
}

// ─── Role Guard ───────────────────────────────────────────────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    if (!user?.roles) return false;

    return requiredRoles.some(role => user.roles.includes(role));
  }
}

// ─── Rate Limiter (SEC-010) ───────────────────────────────────
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new BoundedMap<string, { count: number; resetAt: number }>(10_000);
  private readonly MAX_REQUESTS_PER_MINUTE = 120;
  private readonly WINDOW_MS = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantContext?.tenantId || 'anonymous';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const key = `${tenantId}:${ip}`;
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.WINDOW_MS };
      this.buckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > this.MAX_REQUESTS_PER_MINUTE) {
      this.logger.warn(`Rate limit exceeded: ${key} (${bucket.count} requests)`);
      throw new ForbiddenException('Rate limit exceeded. Please slow down.');
    }

    // Cleanup old buckets periodically
    if (this.buckets.size > 100_000) {
      for (const [k, v] of this.buckets) {
        if (now > v.resetAt) this.buckets.delete(k);
      }
    }

    return true;
  }
}

// ─── Guards Index ─────────────────────────────────────────────
export { JwtAuthGuard, Public, IS_PUBLIC_KEY } from './jwt-auth.guard';
export type { JwtPayload } from './jwt-auth.guard';
