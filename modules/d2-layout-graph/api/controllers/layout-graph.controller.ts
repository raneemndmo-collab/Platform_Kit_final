import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D2: Layout Graph Engine — Controller
// API: /api/v1/layout/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { LayoutGraphEngineService } from '../../application/services/layout-graph.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/layout')
export class LayoutGraphEngineController {
  constructor(private readonly service: LayoutGraphEngineService) {}

  @Post('analyze-layout') @Audit('internal') async analyzeLayout(@Body() body: Record<string, unknown>) { return this.service.analyzeLayout(body.tenantId, body); }
  @Post('solve-constraints') @Audit('internal') async solveConstraints(@Body() body: Record<string, unknown>) { return this.service.solveConstraints(body.tenantId, body); }
  @Post('adapt-layout') @Audit('internal') async adaptLayout(@Body() body: Record<string, unknown>) { return this.service.adaptLayout(body.tenantId, body); }
  @Get(':id') async getGrid(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getGrid(t, id); }
  @Get(':id') async getBreakpoints(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getBreakpoints(t, id); }
  @Get(':id') async getConstraints(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getConstraints(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
