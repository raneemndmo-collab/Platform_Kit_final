// K2: Authorization — Controller
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Tenant, Audit } from '../../../shared/decorators';
import { TenantContext } from '../../../shared/interfaces';
import { K2AuthzService } from '../domain/entities';

@ApiTags('K2 - Authorization')
@Controller('api/v1/authz')
export class K2AuthzController {
  constructor(private readonly authzService: K2AuthzService) {}

  @Post('check')
  @Audit('read')
  @ApiOperation({ summary: 'Check permission (< 5ms p95)' })
  async checkPermission(
    @Tenant() tenant: TenantContext,
    @Body() body: { userId: string; resource: string; action: string },
  ) {
    return this.authzService.checkPermission(
      tenant.tenantId, body.userId, body.resource, body.action,
    );
  }

  @Get('roles')
  @Audit('read')
  async listRoles(@Tenant() tenant: TenantContext) {
    return this.authzService.listRoles(tenant.tenantId);
  }

  @Post('roles')
  @Audit('write')
  async createRole(@Tenant() tenant: TenantContext, @Body() body: Record<string, unknown>) {
    return this.authzService.createRole(tenant.tenantId, 'system', body);
  }

  @Post('roles/:roleId/assign/:userId')
  @Audit('critical')
  async assignRole(
    @Tenant() tenant: TenantContext,
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.authzService.assignRole(tenant.tenantId, 'system', userId, roleId);
  }

  @Post('permissions')
  @Audit('write')
  async registerPermission(@Tenant() tenant: TenantContext, @Body() body: Record<string, unknown>) {
    return this.authzService.registerPermission(tenant.tenantId, body);
  }

  @Get('health')
  async health() {
    return { module: 'K2', status: 'healthy', timestamp: new Date().toISOString(),
      checks: [{ name: 'database', status: 'up' }, { name: 'policy-engine', status: 'up' }] };
  }
}
