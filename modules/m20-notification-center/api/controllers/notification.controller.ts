import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { NotificationService } from '../../application/services/notification.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post('send') @Audit('internal')
  async send(@Body() body: Record<string, unknown>) { return this.service.send(body.tenantId, body); }

  @Post('send-bulk') @Audit('internal')
  async sendBulk(@Body() body: Record<string, unknown>) { return this.service.sendBulk(body.tenantId, body.userIds, body); }

  @Get()
  async list(@Query('tenantId') t: string, @Query('userId') u: string, @Query('unreadOnly') r?: string) { return this.service.getNotifications(t, u, r === 'true'); }

  @Put(':id/read') @Audit('internal')
  async markRead(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.markAsRead(body.tenantId, id, body.userId); }

  @Put('read-all') @Audit('internal')
  async markAllRead(@Body() body: Record<string, unknown>) { return this.service.markAllRead(body.tenantId, body.userId); }

  @Get('unread-count')
  async unreadCount(@Query('tenantId') t: string, @Query('userId') u: string) { return this.service.getUnreadCount(t, u); }

  @Post('preferences') @Audit('internal')
  async setPref(@Body() body: Record<string, unknown>) { return this.service.setPreference(body.tenantId, body); }

  @Post('templates') @Audit('internal')
  async createTemplate(@Body() body: Record<string, unknown>) { return this.service.createTemplate(body.tenantId, body); }

  @Get('health')
  async health() { return this.service.health(); }
}
