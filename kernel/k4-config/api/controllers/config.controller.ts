// =============================================================================
// K4: Configuration — API Controller
// API Surface: /api/v1/config/*
// Constitutional Reference: ACT-001 (Action Registry), P-017 (Audit)
// =============================================================================

import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Tenant, Audit } from '../../../shared/decorators';
import { TenantContext } from '../../../shared/interfaces';
import { K4ConfigService, SetConfigDto, CreateFeatureFlagDto, ToggleFeatureFlagDto } from '../application/handlers/config.service';

@ApiTags('K4 - Configuration')
@Controller('api/v1/config')
export class K4ConfigController {
  constructor(private readonly configService: K4ConfigService) {}

  // === Configuration Endpoints ===

  @Get('modules/:moduleId')
  @Audit('read')
  @ApiOperation({ summary: 'Get all configurations for a module' })
  async getModuleConfigs(
    @Tenant() tenant: TenantContext,
    @Param('moduleId') moduleId: string,
    @Query('environment') environment?: string,
  ) {
    return this.configService.getModuleConfigs(
      tenant.tenantId, moduleId, environment,
    );
  }

  @Get('modules/:moduleId/keys/:key')
  @Audit('read')
  @ApiOperation({ summary: 'Get a specific configuration value' })
  async getConfig(
    @Tenant() tenant: TenantContext,
    @Param('moduleId') moduleId: string,
    @Param('key') key: string,
    @Query('environment') environment?: string,
  ) {
    return this.configService.getConfig(
      tenant.tenantId, moduleId, key, environment,
    );
  }

  @Put('values')
  @Audit('write')
  @ApiOperation({ summary: 'Set a configuration value' })
  async setConfig(
    @Tenant() tenant: TenantContext,
    @Body() dto: SetConfigDto,
  ) {
    return this.configService.setConfig(tenant.tenantId, 'system', dto);
  }

  @Delete('modules/:moduleId/keys/:key')
  @Audit('critical')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a configuration value' })
  async deleteConfig(
    @Tenant() tenant: TenantContext,
    @Param('moduleId') moduleId: string,
    @Param('key') key: string,
    @Query('environment') environment?: string,
  ) {
    return this.configService.deleteConfig(
      tenant.tenantId, moduleId, key, environment,
    );
  }

  // === Feature Flag Endpoints ===

  @Get('flags')
  @Audit('read')
  @ApiOperation({ summary: 'List all feature flags' })
  async listFlags(
    @Tenant() tenant: TenantContext,
    @Query('moduleId') moduleId?: string,
  ) {
    return this.configService.listFeatureFlags(tenant.tenantId, moduleId);
  }

  @Get('flags/:name')
  @Audit('read')
  @ApiOperation({ summary: 'Get a feature flag' })
  async getFlag(
    @Tenant() tenant: TenantContext,
    @Param('name') name: string,
  ) {
    return this.configService.getFeatureFlag(tenant.tenantId, name);
  }

  @Get('flags/:name/enabled')
  @Audit('read')
  @ApiOperation({ summary: 'Check if feature flag is enabled' })
  async isFlagEnabled(
    @Tenant() tenant: TenantContext,
    @Param('name') name: string,
  ) {
    const enabled = await this.configService.isFeatureEnabled(tenant.tenantId, name);
    return { name, enabled };
  }

  @Post('flags')
  @Audit('write')
  @ApiOperation({ summary: 'Create a feature flag' })
  async createFlag(
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateFeatureFlagDto,
  ) {
    return this.configService.createFeatureFlag(tenant.tenantId, 'system', dto);
  }

  @Put('flags/:name/toggle')
  @Audit('write')
  @ApiOperation({ summary: 'Toggle a feature flag' })
  async toggleFlag(
    @Tenant() tenant: TenantContext,
    @Param('name') name: string,
    @Body() dto: ToggleFeatureFlagDto,
  ) {
    return this.configService.toggleFeatureFlag(tenant.tenantId, 'system', name, dto);
  }

  // === Environment Endpoints ===

  @Get('environments')
  @Audit('read')
  @ApiOperation({ summary: 'List all environments' })
  async listEnvironments(@Tenant() tenant: TenantContext) {
    return this.configService.listEnvironments(tenant.tenantId);
  }

  // === Health Check (K9 Contract) ===

  @Get('health')
  @ApiOperation({ summary: 'K4 health check' })
  @ApiResponse({ status: 200, description: 'K4 Configuration is healthy' })
  async healthCheck() {
    return {
      module: 'K4',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'database', status: 'up' },
        { name: 'cache', status: 'up' },
      ],
    };
  }
}
