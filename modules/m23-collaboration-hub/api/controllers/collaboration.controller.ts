import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { CollaborationService } from '../../application/services/collaboration.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/collaboration')
export class CollaborationController {
  constructor(private readonly service: CollaborationService) {}

  @Post('channels') @Audit('internal')
  async createChannel(@Body() body: Record<string, unknown>) { return this.service.createChannel(body.tenantId, body); }

  @Get('channels/:id')
  async getChannel(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getChannel(t, id); }

  @Get('channels')
  async listChannels(@Query('tenantId') t: string) { return this.service.listChannels(t); }

  @Post('messages') @Audit('internal')
  async sendMessage(@Body() body: Record<string, unknown>) { return this.service.sendMessage(body.tenantId, body); }

  @Get('channels/:id/messages')
  async getMessages(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getMessages(t, id); }

  @Post('presence') @Audit('internal')
  async updatePresence(@Body() body: Record<string, unknown>) { return this.service.updatePresence(body.tenantId, body.userId, body.status, body.activeChannelId); }

  @Get('online')
  async online(@Query('tenantId') t: string) { return this.service.getOnlineUsers(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
