import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { IntegrationService } from '../../application/services/integration.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/integrations')
export class IntegrationController {
  constructor(private readonly service: IntegrationService) {}

  @Post('adapters') @Audit('restricted')
  async createAdapter(@Body() body: Record<string, unknown>) { return this.service.createAdapter(body.tenantId, body); }

  @Post('adapters/:id/test') @Audit('internal')
  async testAdapter(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.testAdapter(body.tenantId, id); }

  @Get('adapters')
  async listAdapters(@Query('tenantId') t: string) { return this.service.listAdapters(t); }

  @Post('flows') @Audit('internal')
  async createFlow(@Body() body: Record<string, unknown>) { return this.service.createFlow(body.tenantId, body); }

  @Post('flows/:id/execute') @Audit('restricted')
  async executeFlow(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.executeFlow(body.tenantId, id); }

  @Post('webhooks') @Audit('restricted')
  async registerWebhook(@Body() body: Record<string, unknown>) { return this.service.registerWebhook(body.tenantId, body); }

  @Get('webhooks')
  async listWebhooks(@Query('tenantId') t: string) { return this.service.listWebhooks(t); }

  @Get('logs')
  async logs(@Query('tenantId') t: string, @Query('adapterId') a?: string) { return this.service.getLogs(t, a); }

  @Get('health')
  async health() { return this.service.health(); }
}
