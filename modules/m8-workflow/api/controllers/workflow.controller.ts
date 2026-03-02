import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { WorkflowService } from '../../application/services/workflow.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Post('definitions') @Audit('internal')
  async createDef(@Body() body: Record<string, unknown>) { return this.service.createDefinition(body.tenantId, body); }

  @Get('definitions')
  async listDefs(@Query('tenantId') t: string, @Query('moduleScope') m?: string) { return this.service.listDefinitions(t, m); }

  @Get('definitions/:id')
  async getDef(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getDefinition(t, id); }

  @Post('start') @Audit('internal')
  async start(@Body() body: Record<string, unknown>) { return this.service.startWorkflow(body.tenantId, body); }

  @Post('instances/:id/process') @Audit('restricted')
  async process(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.processStep(body.tenantId, id, body); }

  @Post('instances/:id/cancel') @Audit('restricted')
  async cancel(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.cancelWorkflow(body.tenantId, id, body.cancelledBy); }

  @Get('instances/:id')
  async getInstance(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getInstance(t, id); }

  @Get('instances/:id/steps')
  async getSteps(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getStepExecutions(t, id); }

  @Get('instances/:id/audit')
  async getAudit(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getAuditTrail(t, id); }

  @Get('pending')
  async pending(@Query('tenantId') t: string, @Query('assigneeId') a: string) { return this.service.getPendingApprovals(t, a); }

  @Get('health')
  async health() { return this.service.health(); }
}
