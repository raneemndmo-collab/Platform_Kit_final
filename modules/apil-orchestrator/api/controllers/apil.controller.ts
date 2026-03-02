import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Get, Body, Param, Query , UseGuards} from '@nestjs/common';
import { APilOrchestratorService } from '../../application/services/apil-orchestrator.service';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';

@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/apil')
export class APilController {
  constructor(private readonly service: APilOrchestratorService) {}
  @Post('plans') createPlan(@Body() body: Record<string, unknown>) { return this.service.createPlan(body.tenantId, body); }
  @Post('plans/:id/execute') execute(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.executePlan(body.tenantId, id); }
  @Get('plans') list(@Query('tenantId') tenantId: string, @Query('status') status?: string) { return this.service.listPlans(tenantId, status); }
  @Get('health') health() { return this.service.health(); }
}
