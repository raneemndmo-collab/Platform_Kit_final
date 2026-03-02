import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D4: Conversion Orchestrator — Controller
// API: /api/v1/conversion/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ConversionOrchestratorService } from '../../application/services/conversion-orchestrator.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/conversion')
export class ConversionOrchestratorController {
  constructor(private readonly service: ConversionOrchestratorService) {}

  @Post('start-conversion') @Audit('internal') async startConversion(@Body() body: Record<string, unknown>) { return this.service.startConversion(body.tenantId, body); }
  @Post('cancel-job') @Audit('internal') async cancelJob(@Body() body: Record<string, unknown>) { return this.service.cancelJob(body.tenantId, body); }
  @Post('retry-step') @Audit('internal') async retryStep(@Body() body: Record<string, unknown>) { return this.service.retryStep(body.tenantId, body); }
  @Get(':id') async getJobStatus(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getJobStatus(t, id); }
  @Get(':id') async getPipeline(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getPipeline(t, id); }
  @Get() async listPipelines(@Query('tenantId') t: string) { return this.service.listPipelines(t); }
  @Post('create-pipeline') @Audit('internal') async createPipeline(@Body() body: Record<string, unknown>) { return this.service.createPipeline(body.tenantId, body); }
  @Get(':id') async getFidelityReport(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getFidelityReport(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
