// =============================================================================
// Rasid Platform v6.2 — Shared Auth Client
// Constitutional Reference: CRS-003
// No business logic in shared libraries (CRS-004, FP-022)
// =============================================================================

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

export interface AuthToken {
  sub: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

export interface AuthValidationResult {
  valid: boolean;
  token?: AuthToken;
  error?: string;
}

@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);

  async validateToken(token: string): Promise<AuthValidationResult> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, error: 'Invalid token format' };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { valid: false, error: 'Token expired' };
      }
      return { valid: true, token: payload as AuthToken };
    } catch (e) {
      return { valid: false, error: 'Token validation failed' };
    }
  }

  extractTenantId(token: AuthToken): string {
    if (!token.tenantId) throw new UnauthorizedException('Token missing tenantId');
    return token.tenantId;
  }

  hasPermission(token: AuthToken, permission: string): boolean {
    return token.permissions?.includes(permission) ?? false;
  }

  hasRole(token: AuthToken, role: string): boolean {
    return token.roles?.includes(role) ?? false;
  }
}
