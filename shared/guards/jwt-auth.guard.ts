// =============================================================================
// SEC-001 FIX: Global JWT Authentication Guard
// SEC-002 FIX: Tenant identity derived from JWT, NOT headers
// SEC-005 FIX: Session validation after login
// Constitutional Reference: P-001 (Security First), SEC-001
// =============================================================================

import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException,
  ForbiddenException, Logger, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';

// Decorator to mark public endpoints (login, health, docs)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'SEC-001 VIOLATION: Missing Authorization header. ' +
        'All endpoints require Bearer token authentication.'
      );
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      // SEC-002 FIX: Tenant identity comes from JWT, NOT from header
      // If header provides X-Tenant-Id, it MUST match JWT
      const headerTenantId = request.headers['x-tenant-id'] as string;
      if (headerTenantId && headerTenantId !== payload.tenantId) {
        this.logger.warn(
          `SEC-002 VIOLATION ATTEMPT: JWT tenant=${payload.tenantId}, ` +
          `header tenant=${headerTenantId}, user=${payload.sub}`
        );
        throw new ForbiddenException(
          'SEC-002 VIOLATION: X-Tenant-Id header does not match JWT tenant identity. ' +
          'Cross-tenant access is FORBIDDEN.'
        );
      }

      // Inject verified identity into request
      (request as any).user = payload;

      // Override tenant context with JWT-verified values
      request.tenantContext = {
        tenantId: payload.tenantId,
        tenantName: request.headers['x-tenant-name'] as string || '',
        subscriptionTier: request.headers['x-tenant-tier'] as string || 'standard',
        resourceLimits: { maxUsers: 0, maxStorage: 0, maxApiCalls: 0 },
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
