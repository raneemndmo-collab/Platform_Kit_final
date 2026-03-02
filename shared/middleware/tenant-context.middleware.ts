// =============================================================================
// Rasid Platform v6 — Tenant Context Middleware
// Constitutional Reference: TNT-001, P-016, FP-011
// Every request MUST carry TenantContext. Queries without tenantId are FORBIDDEN.
// =============================================================================

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../interfaces';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new ForbiddenException(
        'FP-011 VIOLATION: Request missing X-Tenant-Id header. ' +
        'Tenant query without TenantContext is FORBIDDEN.'
      );
    }

    // SEC-002 FIX: Accept provisional tenantId from header.
    // JwtAuthGuard will OVERRIDE with JWT-verified tenantId and reject mismatches.
    // subscriptionTier from header is provisional — should be verified from DB in production.
    req.tenantContext = {
      tenantId, // Provisional — JwtAuthGuard overrides this
      tenantName: req.headers['x-tenant-name'] as string || '',
      subscriptionTier: req.headers['x-tenant-tier'] as string || 'standard',
      resourceLimits: {
        maxUsers: 0,
        maxStorage: 0,
        maxApiCalls: 0,
      },
    };

    next();
  }
}
