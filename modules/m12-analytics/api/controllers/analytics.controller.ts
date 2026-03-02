import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Query , UseGuards} from '@nestjs/common';
import { AnalyticsService } from '../../application/services/analytics.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Post('events') @Audit('internal')
  async ingest(@Body() b: Record<string, unknown>) { return this.service.ingestEvent(b.tenantId, b); }

  @Post('events/batch') @Audit('internal')
  async batch(@Body() b: Record<string, unknown>) { return this.service.ingestBatch(b.tenantId, b.events); }

  @Get('metrics')
  async metrics(@Query('tenantId') t: string, @Query('name') n: string, @Query('from') f: string, @Query('to') to: string) {
    return this.service.queryMetrics(t, { metricName: n, from: new Date(f), to: new Date(to) });
  }

  @Post('metrics/compute') @Audit('internal')
  async compute(@Body() b: Record<string, unknown>) { return this.service.computeMetric(b.tenantId, b); }

  @Get('data-lake')
  async lake(@Query('tenantId') t: string, @Query('tier') tier?: string) { return this.service.queryDataLake(t, tier); }

  @Get('pipeline-stats')
  async stats(@Query('tenantId') t: string) { return this.service.getPipelineStats(t); }

  @Post('dashboards') @Audit('internal')
  async createDash(@Body() b: Record<string, unknown>) { return this.service.createDashboard(b.tenantId, b); }

  @Get('dashboards')
  async listDash(@Query('tenantId') t: string) { return this.service.listDashboards(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
