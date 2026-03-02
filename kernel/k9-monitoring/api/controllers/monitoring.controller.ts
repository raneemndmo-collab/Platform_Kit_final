// =============================================================================
// K9: Monitoring Controller
// =============================================================================

import { Controller, Post, Get, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { K9MonitoringService } from '../../application/handlers/monitoring.service';
import { Tenant, Audit } from '../../../../shared/decorators';

@ApiTags('K9: Monitoring')
@ApiBearerAuth()
@Controller('api/v1/monitoring')
export class MonitoringController {
  constructor(private readonly monitorService: K9MonitoringService) {}

  @Post('health')
  @ApiOperation({ summary: 'Record module health status' })
  async recordHealth(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      moduleId: string; status: string; responseTimeMs?: number;
      cpuUsagePercent?: number; memoryUsageMb?: number;
    },
  ) {
    return this.monitorService.recordHealth(tenant.tenantId, dto);
  }

  @Get('health/modules')
  @ApiOperation({ summary: 'Get all module health status' })
  async getAllHealth(@Tenant() tenant: { tenantId: string }) {
    return this.monitorService.getAllModuleHealth(tenant.tenantId);
  }

  @Get('health/modules/:moduleId')
  @ApiOperation({ summary: 'Get specific module health' })
  async getModuleHealth(
    @Tenant() tenant: { tenantId: string },
    @Param('moduleId') moduleId: string,
  ) {
    return this.monitorService.getModuleHealth(tenant.tenantId, moduleId);
  }

  @Post('metrics')
  @ApiOperation({ summary: 'Record a metric' })
  async recordMetric(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      moduleId: string; metricName: string; metricType: string;
      value: number; unit?: string; labels?: Record<string, string>;
    },
  ) {
    return this.monitorService.recordMetric(tenant.tenantId, dto);
  }

  @Get('metrics/:moduleId')
  @ApiOperation({ summary: 'Get module metrics' })
  async getMetrics(
    @Tenant() tenant: { tenantId: string },
    @Param('moduleId') moduleId: string,
    @Query('metricName') metricName?: string,
    @Query('limit') limit?: string,
  ) {
    return this.monitorService.getMetrics(tenant.tenantId, moduleId, metricName, limit ? parseInt(limit) : undefined);
  }

  @Post('alerts/rules')
  @Audit('internal')
  @ApiOperation({ summary: 'Create alert rule' })
  async createAlertRule(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      name: string; moduleId: string; metricName: string;
      operator: string; threshold: number; severity?: string;
      notificationChannels?: string[];
    },
  ) {
    return this.monitorService.createAlertRule(tenant.tenantId, dto);
  }

  @Get('alerts/rules')
  @ApiOperation({ summary: 'List alert rules' })
  async getAlertRules(
    @Tenant() tenant: { tenantId: string },
    @Query('moduleId') moduleId?: string,
  ) {
    return this.monitorService.getAlertRules(tenant.tenantId, moduleId);
  }

  @Put('alerts/rules/:id/toggle')
  @Audit('internal')
  @ApiOperation({ summary: 'Enable/disable alert rule' })
  async toggleRule(
    @Tenant() tenant: { tenantId: string },
    @Param('id') ruleId: string,
    @Body() dto: { isActive: boolean },
  ) {
    return this.monitorService.toggleAlertRule(tenant.tenantId, ruleId, dto.isActive);
  }

  @Get('alerts/incidents')
  @ApiOperation({ summary: 'List alert incidents' })
  async getIncidents(
    @Tenant() tenant: { tenantId: string },
    @Query('status') status?: string,
  ) {
    return this.monitorService.getIncidents(tenant.tenantId, status);
  }

  @Put('alerts/incidents/:id/acknowledge')
  @Audit('internal')
  @ApiOperation({ summary: 'Acknowledge incident' })
  async acknowledgeIncident(
    @Tenant() tenant: { tenantId: string; userId?: string },
    @Param('id') incidentId: string,
  ) {
    return this.monitorService.acknowledgeIncident(tenant.tenantId, incidentId, tenant.userId || 'system');
  }

  @Put('alerts/incidents/:id/resolve')
  @Audit('internal')
  @ApiOperation({ summary: 'Resolve incident' })
  async resolveIncident(
    @Tenant() tenant: { tenantId: string },
    @Param('id') incidentId: string,
    @Body() dto: { note?: string },
  ) {
    return this.monitorService.resolveIncident(tenant.tenantId, incidentId, dto.note);
  }

  @Get('health')
  @ApiOperation({ summary: 'K9 health check' })
  async health() {
    return this.monitorService.getHealth();
  }
}
