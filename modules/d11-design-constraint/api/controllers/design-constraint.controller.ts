import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D11: Design Constraint Engine — Controller
// API: /api/v1/design-constraints/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { DesignConstraintEngineService } from '../../application/services/design-constraint.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/design-constraints')
export class DesignConstraintEngineController {
  constructor(private readonly service: DesignConstraintEngineService) {}

  @Post('analyze-design') @Audit('internal') async analyzeDesign(@Body() body: Record<string, unknown>) { return this.service.analyzeDesign(body.tenantId, body); }
  @Post('apply-constraints') @Audit('internal') async applyConstraints(@Body() body: Record<string, unknown>) { return this.service.applyConstraints(body.tenantId, body); }
  @Post('balance-density') @Audit('internal') async balanceDensity(@Body() body: Record<string, unknown>) { return this.service.balanceDensity(body.tenantId, body); }
  @Get(':id') async getConstraints(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getConstraints(t, id); }
  @Get(':id') async getDensityReport(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getDensityReport(t, id); }
  @Get() async listRules(@Query('tenantId') t: string) { return this.service.listRules(t); }
  @Post('create-rule') @Audit('internal') async createRule(@Body() body: Record<string, unknown>) { return this.service.createRule(body.tenantId, body); }
  @Get('health') async health() { return this.service.health(); }
}
