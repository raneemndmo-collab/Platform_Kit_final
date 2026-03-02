import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ReportingService } from '../../application/services/reporting.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/reports')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Post('definitions') @Audit('internal')
  async createDef(@Body() body: Record<string, unknown>) { return this.service.createDefinition(body.tenantId, body); }

  @Get('definitions')
  async listDefs(@Query('tenantId') t: string, @Query('category') c?: string) { return this.service.listDefinitions(t, c); }

  @Get('definitions/:id')
  async getDef(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getDefinition(t, id); }

  @Post('execute') @Audit('internal')
  async execute(@Body() body: Record<string, unknown>) { return this.service.executeReport(body.tenantId, body); }

  @Get('executions/:id')
  async getExec(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getExecution(t, id); }

  @Get('executions')
  async listExecs(@Query('tenantId') t: string, @Query('definitionId') d?: string) { return this.service.listExecutions(t, d); }

  @Post('schedules') @Audit('internal')
  async createSchedule(@Body() body: Record<string, unknown>) { return this.service.createSchedule(body.tenantId, body); }

  @Get('schedules')
  async listSchedules(@Query('tenantId') t: string) { return this.service.listSchedules(t); }

  @Put('schedules/:id/toggle') @Audit('internal')
  async toggleSchedule(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.toggleSchedule(body.tenantId, id, body.isActive); }

  @Post('templates') @Audit('internal')
  async createTemplate(@Body() body: Record<string, unknown>) { return this.service.createTemplate(body.tenantId, body); }

  @Get('templates')
  async listTemplates(@Query('tenantId') t: string, @Query('category') c?: string) { return this.service.listTemplates(t, c); }

  @Get('health')
  async health() { return this.service.health(); }
}
