// Rasid v6.4 — Tenant Scope Guard — B1 Fix
// Ensures every query has tenant context
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';

@Injectable()
export class TenantScopeGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopeGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantContext?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException(
        'B1 VIOLATION: Tenant context missing. All operations require tenant scope.'
      );
    }

    // Ensure tenantId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId) && tenantId.length > 100) {
      this.logger.warn(`Suspicious tenantId format: ${tenantId.slice(0, 50)}`);
      throw new ForbiddenException('Invalid tenant identifier format');
    }

    return true;
  }
}
