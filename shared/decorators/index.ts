// =============================================================================
// Rasid Platform v6 — Shared Decorators
// Constitutional Reference: P-016, P-017, ACT-001
// =============================================================================

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { TenantContext } from '../interfaces';

// Extract TenantContext from request (TNT-001)
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.tenantContext) {
      throw new Error('FP-011: TenantContext not available. TenantContextMiddleware may not be applied.');
    }
    return request.tenantContext;
  },
);

// Mark action for audit logging (P-017)
export const AUDIT_KEY = 'audit_classification';
export const Audit = (classification: 'none' | 'read' | 'write' | 'critical' | 'internal' | 'confidential' | 'restricted') =>
  SetMetadata(AUDIT_KEY, classification);

// Mark action with required permissions (K2 AuthZ)
export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Mark action with rate limit policy (ACT-001)
export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (maxPerMinute: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxPerMinute });

// Module identification decorator
export const MODULE_ID_KEY = 'module_id';
export const ModuleId = (moduleId: string) =>
  SetMetadata(MODULE_ID_KEY, moduleId);
