// =============================================================================
// Rasid Platform v6.2 — Shared API Client
// Constitutional Reference: CRS-003, P-006
// Synchronous cross-module calls SHALL NOT exceed 3 hops (P-006)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

export interface APICallOptions {
  module: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  tenantId: string;
  data?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  hopCount: number;
}

@Injectable()
export class APIClient {
  private readonly logger = new Logger(APIClient.name);
  private readonly MAX_HOPS = 3;

  async call<T>(options: APICallOptions, currentHopCount: number = 0): Promise<APIResponse<T>> {
    if (currentHopCount >= this.MAX_HOPS) {
      this.logger.error(`P-006 VIOLATION: Hop limit exceeded (${currentHopCount}/${this.MAX_HOPS})`);
      return { success: false, error: 'Hop limit exceeded (P-006)', statusCode: 502, hopCount: currentHopCount };
    }

    const baseUrl = this.resolveModuleUrl(options.module);
    const url = `${baseUrl}${options.endpoint}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeout ?? 5000);
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': options.tenantId,
          'X-Hop-Count': String(currentHopCount + 1),
          ...options.headers,
        },
        body: options.data ? JSON.stringify(options.data) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => null);
      return { success: response.ok, data: data as T, statusCode: response.status, hopCount: currentHopCount + 1 };
    } catch (error) {
      this.logger.error(`API call failed: ${options.module}${options.endpoint}`);
      return { success: false, error: String(error), statusCode: 503, hopCount: currentHopCount + 1 };
    }
  }

  private resolveModuleUrl(module: string): string {
    return process.env[`MODULE_${module.toUpperCase()}_URL`] || `http://localhost:3000/api/v1/${module.toLowerCase()}`;
  }
}
