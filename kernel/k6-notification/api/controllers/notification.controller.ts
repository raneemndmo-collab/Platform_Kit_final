// =============================================================================
// K6: Notification Controller
// =============================================================================

import { Controller, Post, Get, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { K6NotificationService } from '../../application/handlers/notification.service';
import { Tenant, Audit } from '../../../../shared/decorators';

@ApiTags('K6: Notification')
@ApiBearerAuth()
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notifyService: K6NotificationService) {}

  @Post('send')
  @Audit('internal')
  @ApiOperation({ summary: 'Send notification via template' })
  async send(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: {
      templateName: string; channel: string; recipientId: string;
      variables?: Record<string, unknown>; correlationId?: string;
    },
  ) {
    return this.notifyService.send(tenant.tenantId, dto);
  }

  @Post('templates')
  @Audit('internal')
  @ApiOperation({ summary: 'Create notification template' })
  async createTemplate(
    @Tenant() tenant: { tenantId: string; userId?: string },
    @Body() dto: {
      name: string; moduleId: string; channel: string;
      subject: string; bodyTemplate: string; variables?: string[];
    },
  ) {
    return this.notifyService.createTemplate(tenant.tenantId, tenant.userId || 'system', dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List notification templates' })
  async getTemplates(
    @Tenant() tenant: { tenantId: string },
    @Query('moduleId') moduleId?: string,
  ) {
    return this.notifyService.getTemplates(tenant.tenantId, moduleId);
  }

  @Put('templates/:id')
  @Audit('internal')
  @ApiOperation({ summary: 'Update notification template' })
  async updateTemplate(
    @Tenant() tenant: { tenantId: string },
    @Param('id') templateId: string,
    @Body() dto: { subject?: string; bodyTemplate?: string; isActive?: boolean },
  ) {
    return this.notifyService.updateTemplate(tenant.tenantId, templateId, dto);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List notification deliveries' })
  async getDeliveries(
    @Tenant() tenant: { tenantId: string },
    @Query('recipientId') recipientId?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
  ) {
    return this.notifyService.getDeliveries(tenant.tenantId, { recipientId, channel, status });
  }

  @Put('preferences/:userId')
  @Audit('internal')
  @ApiOperation({ summary: 'Set notification preference' })
  async setPreference(
    @Tenant() tenant: { tenantId: string },
    @Param('userId') userId: string,
    @Body() dto: { channel: string; enabled: boolean; mutedTemplates?: string[] },
  ) {
    return this.notifyService.setPreference(tenant.tenantId, userId, dto);
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(
    @Tenant() tenant: { tenantId: string },
    @Param('userId') userId: string,
  ) {
    return this.notifyService.getPreferences(tenant.tenantId, userId);
  }

  @Get('health')
  @ApiOperation({ summary: 'K6 health check' })
  async health() {
    return this.notifyService.getHealth();
  }
}
