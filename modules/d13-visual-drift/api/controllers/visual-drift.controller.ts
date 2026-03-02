import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D13: Visual Drift Detection Engine — Controller
// API: /api/v1/vdrift/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { VisualDriftDetectionEngineService } from '../../application/services/visual-drift.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/vdrift')
export class VisualDriftDetectionEngineController {
  constructor(private readonly service: VisualDriftDetectionEngineService) {}

  @Post('analyze-fidelity') @Audit('internal') async analyzeFidelity(@Body() body: Record<string, unknown>) { return this.service.analyzeFidelity(body.tenantId, body); }
  @Post('compare-versions') @Audit('internal') async compareVersions(@Body() body: Record<string, unknown>) { return this.service.compareVersions(body.tenantId, body); }
  @Post('set-baseline') @Audit('internal') async setBaseline(@Body() body: Record<string, unknown>) { return this.service.setBaseline(body.tenantId, body); }
  @Get(':id') async getFidelityScore(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getFidelityScore(t, id); }
  @Get(':id') async getDiff(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getDiff(t, id); }
  @Get(':id') async getRegression(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getRegression(t, id); }
  @Get() async listAlerts(@Query('tenantId') t: string) { return this.service.listAlerts(t); }
  @Get('health') async health() { return this.service.health(); }
}
