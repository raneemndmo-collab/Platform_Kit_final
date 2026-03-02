// =============================================================================
// K10: Module Lifecycle Controller
// =============================================================================

import { Controller, Post, Get, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { K10LifecycleService } from '../../application/handlers/lifecycle.service';
import { Tenant, Audit } from '../../../../shared/decorators';

@ApiTags('K10: Module Lifecycle')
@ApiBearerAuth()
@Controller('api/v1/lifecycle')
export class LifecycleController {
  constructor(private readonly lcService: K10LifecycleService) {}

  @Post('modules')
  @Audit('internal')
  @ApiOperation({ summary: 'Register a module' })
  async register(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      moduleId: string; name: string; tier: string; version: string;
      description?: string; databaseName: string; apiBasePath: string;
      eventNamespaces?: string[]; exposedPermissions?: string[];
      phase?: number;
    },
  ) {
    return this.lcService.register(tenant.tenantId, dto);
  }

  @Get('modules')
  @ApiOperation({ summary: 'List registered modules' })
  async getModules(
    @Tenant() tenant: { tenantId: string },
    @Query('tier') tier?: string,
  ) {
    return this.lcService.getModules(tenant.tenantId, tier);
  }

  @Get('modules/:moduleId')
  @ApiOperation({ summary: 'Get module details' })
  async getModule(
    @Tenant() tenant: { tenantId: string },
    @Param('moduleId') moduleId: string,
  ) {
    return this.lcService.getModule(tenant.tenantId, moduleId);
  }

  @Put('modules/:moduleId/status')
  @Audit('internal')
  @ApiOperation({ summary: 'Update module status' })
  async updateStatus(
    @Tenant() tenant: { tenantId: string },
    @Param('moduleId') moduleId: string,
    @Body() dto: { status: string },
  ) {
    return this.lcService.updateStatus(tenant.tenantId, moduleId, dto.status);
  }

  @Post('modules/:moduleId/freeze')
  @Audit('restricted')
  @ApiOperation({ summary: 'Freeze module (P-010)' })
  async freezeModule(
    @Tenant() tenant: { tenantId: string; userId?: string },
    @Param('moduleId') moduleId: string,
  ) {
    return this.lcService.freezeModule(tenant.tenantId, moduleId, tenant.userId || 'system');
  }

  @Post('dependencies')
  @Audit('internal')
  @ApiOperation({ summary: 'Add dependency edge' })
  async addDependency(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      sourceModule: string; targetModule: string;
      dependencyType?: string; contractVersion?: string;
    },
  ) {
    return this.lcService.addDependency(tenant.tenantId, dto);
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'Get dependency graph' })
  async getDependencyGraph(@Tenant() tenant: { tenantId: string }) {
    return this.lcService.getDependencyGraph(tenant.tenantId);
  }

  @Get('dependencies/validate')
  @ApiOperation({ summary: 'Validate dependency graph (DEP-003, DEP-004)' })
  async validateGraph(@Tenant() tenant: { tenantId: string }) {
    return this.lcService.validateGraph(tenant.tenantId);
  }

  @Post('modules/:moduleId/versions')
  @Audit('internal')
  @ApiOperation({ summary: 'Register module version' })
  async registerVersion(
    @Tenant() tenant: { tenantId: string; userId?: string },
    @Param('moduleId') moduleId: string,
    @Body() dto: { version: string; changelog?: string; breakingChanges?: string[] },
  ) {
    return this.lcService.registerVersion(tenant.tenantId, {
      moduleId, ...dto, releasedBy: tenant.userId || 'system',
    });
  }

  @Get('modules/:moduleId/versions')
  @ApiOperation({ summary: 'Get module versions' })
  async getVersions(
    @Tenant() tenant: { tenantId: string },
    @Param('moduleId') moduleId: string,
  ) {
    return this.lcService.getVersions(tenant.tenantId, moduleId);
  }

  @Get('health')
  @ApiOperation({ summary: 'K10 health check' })
  async health(@Tenant() tenant: { tenantId: string }) {
    return this.lcService.getHealth(tenant.tenantId);
  }
}
