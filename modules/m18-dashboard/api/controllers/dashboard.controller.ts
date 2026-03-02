import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { DashboardService } from '../../application/services/dashboard.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/dashboards')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Post() @Audit('internal')
  async create(@Body() body: Record<string, unknown>) { return this.service.createDashboard(body.tenantId, body); }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getDashboard(t, id); }

  @Get()
  async list(@Query('tenantId') t: string, @Query('ownerId') o?: string) { return this.service.listDashboards(t, o); }

  @Post(':id/widgets') @Audit('internal')
  async addWidget(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.addWidget(body.tenantId, id, body); }

  @Get(':id/widgets')
  async getWidgets(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getWidgets(t, id); }

  @Post('realtime/push') @Audit('internal')
  async push(@Body() body: Record<string, unknown>) { return this.service.pushRealtimeUpdate(body.tenantId, body.channel, body.payload); }

  @Post('subscribe') @Audit('internal')
  async subscribe(@Body() body: Record<string, unknown>) { return this.service.subscribe(body.tenantId, body); }

  @Get('connections/count')
  async connections(@Query('tenantId') t: string) { return this.service.getConcurrentConnections(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
