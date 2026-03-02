import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ComplianceService } from '../../application/services/compliance.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Post('frameworks') @Audit('restricted')
  async createFramework(@Body() b: Record<string, unknown>) { return this.service.createFramework(b.tenantId, b); }

  @Get('frameworks')
  async listFrameworks(@Query('tenantId') t: string) { return this.service.listFrameworks(t); }

  @Post('controls') @Audit('internal')
  async createControl(@Body() b: Record<string, unknown>) { return this.service.createControl(b.tenantId, b); }

  @Put('controls/:id/assess') @Audit('restricted')
  async assessControl(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.assessControl(b.tenantId, id, b); }

  @Get('controls')
  async listControls(@Query('tenantId') t: string, @Query('frameworkId') f?: string) { return this.service.listControls(t, f); }

  @Post('assessments') @Audit('restricted')
  async startAssessment(@Body() b: Record<string, unknown>) { return this.service.startAssessment(b.tenantId, b); }

  @Put('assessments/:id/complete') @Audit('restricted')
  async completeAssessment(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.completeAssessment(b.tenantId, id, b); }

  @Get('dashboard')
  async dashboard(@Query('tenantId') t: string) { return this.service.getComplianceDashboard(t); }

  @Post('risks') @Audit('internal')
  async createRisk(@Body() b: Record<string, unknown>) { return this.service.createRisk(b.tenantId, b); }

  @Get('risks')
  async listRisks(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listRisks(t, s); }

  @Post('violations') @Audit('restricted')
  async reportViolation(@Body() b: Record<string, unknown>) { return this.service.reportViolation(b.tenantId, b); }

  @Put('violations/:id/resolve') @Audit('restricted')
  async resolveViolation(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.resolveViolation(b.tenantId, id, b); }

  @Get('health')
  async health() { return this.service.health(); }
}
