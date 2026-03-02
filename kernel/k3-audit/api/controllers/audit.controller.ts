// =============================================================================
// K3: Audit Controller
// Constitutional Reference: P-017 (Audit Everything), append-only
// =============================================================================

import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { K3AuditService } from '../../application/handlers/audit.service';
import { Tenant, Audit } from '../../../../shared/decorators';

@ApiTags('K3: Audit')
@ApiBearerAuth()
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: K3AuditService) {}

  @Post('record')
  @Audit('confidential')
  @ApiOperation({ summary: 'Record audit event (append-only)' })
  async recordAudit(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      userId: string;
      moduleId: string;
      action: string;
      resourceType: string;
      resourceId?: string;
      outcome: 'success' | 'failure' | 'denied';
      details?: Record<string, unknown>;
      ipAddress?: string;
      correlationId?: string;
    },
  ) {
    return this.auditService.record({
      tenantId: tenant.tenantId,
      ...dto,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search audit records' })
  async searchAudit(
    @Tenant() tenant: { tenantId: string },
    @Query('moduleId') moduleId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('outcome') outcome?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.search(tenant.tenantId, {
      moduleId, userId, action, resourceType, outcome,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('timeline/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get audit timeline for a resource' })
  async getTimeline(
    @Tenant() tenant: { tenantId: string },
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.auditService.getTimeline(tenant.tenantId, resourceType, resourceId);
  }

  @Get('health')
  @ApiOperation({ summary: 'K3 health check' })
  async health() {
    return this.auditService.getHealth();
  }
}
