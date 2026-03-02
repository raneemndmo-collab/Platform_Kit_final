// =============================================================================
// K8: Data Governance Controller
// =============================================================================

import { Controller, Post, Get, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { K8GovernanceService } from '../../application/handlers/governance.service';
import { Tenant, Audit } from '../../../../shared/decorators';

@ApiTags('K8: Data Governance')
@ApiBearerAuth()
@Controller('api/v1/governance')
export class GovernanceController {
  constructor(private readonly govService: K8GovernanceService) {}

  @Post('classifications')
  @Audit('confidential')
  @ApiOperation({ summary: 'Classify a data field' })
  async classify(
    @Tenant() tenant: { tenantId: string; userId?: string },
    @Body() dto: {
      moduleId: string; entityName: string; fieldPath: string;
      classification: string; isPII?: boolean; isFinancial?: boolean;
      encryptionRequired?: boolean;
    },
  ) {
    return this.govService.classify(tenant.tenantId, tenant.userId || 'system', dto);
  }

  @Get('classifications')
  @ApiOperation({ summary: 'List data classifications' })
  async getClassifications(
    @Tenant() tenant: { tenantId: string },
    @Query('moduleId') moduleId?: string,
  ) {
    return this.govService.getClassifications(tenant.tenantId, moduleId);
  }

  @Get('classifications/pii')
  @ApiOperation({ summary: 'List PII fields' })
  async getPIIFields(@Tenant() tenant: { tenantId: string }) {
    return this.govService.getPIIFields(tenant.tenantId);
  }

  @Post('retention')
  @Audit('confidential')
  @ApiOperation({ summary: 'Set retention policy' })
  async setRetentionPolicy(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      moduleId: string; entityName: string; retentionDays: number;
      archiveStrategy: string;
    },
  ) {
    return this.govService.setRetentionPolicy(tenant.tenantId, dto);
  }

  @Get('retention')
  @ApiOperation({ summary: 'List retention policies' })
  async getRetentionPolicies(
    @Tenant() tenant: { tenantId: string },
    @Query('moduleId') moduleId?: string,
  ) {
    return this.govService.getRetentionPolicies(tenant.tenantId, moduleId);
  }

  @Put('retention/:moduleId/:entityName/legal-hold')
  @Audit('restricted')
  @ApiOperation({ summary: 'Set legal hold on entity' })
  async setLegalHold(
    @Tenant() tenant: { tenantId: string },
    @Param('moduleId') moduleId: string,
    @Param('entityName') entityName: string,
    @Body() hold: { enabled: boolean; reason?: string; until?: string },
  ) {
    return this.govService.setLegalHold(tenant.tenantId, moduleId, entityName, hold);
  }

  @Post('schemas')
  @Audit('internal')
  @ApiOperation({ summary: 'Register data schema' })
  async registerSchema(
    @Tenant() tenant: { tenantId: string; userId?: string },
    @Body() dto: {
      moduleId: string; schemaName: string; version: number;
      jsonSchema: Record<string, unknown>;
    },
  ) {
    return this.govService.registerSchema(tenant.tenantId, tenant.userId || 'system', dto);
  }

  @Get('schemas')
  @ApiOperation({ summary: 'List data schemas' })
  async getSchemas(
    @Tenant() tenant: { tenantId: string },
    @Query('moduleId') moduleId?: string,
  ) {
    return this.govService.getSchemas(tenant.tenantId, moduleId);
  }

  @Get('health')
  @ApiOperation({ summary: 'K8 health check' })
  async health() {
    return this.govService.getHealth();
  }
}
