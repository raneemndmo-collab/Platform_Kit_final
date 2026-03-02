import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D8: Typography Engine — Controller
// API: /api/v1/typography/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { TypographyEngineService } from '../../application/services/typography-engine.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/typography')
export class TypographyEngineController {
  constructor(private readonly service: TypographyEngineService) {}

  @Post('resolve-font') @Audit('internal') async resolveFont(@Body() body: Record<string, unknown>) { return this.service.resolveFont(body.tenantId, body); }
  @Post('shape-text') @Audit('internal') async shapeText(@Body() body: Record<string, unknown>) { return this.service.shapeText(body.tenantId, body); }
  @Post('build-fallback-ladder') @Audit('internal') async buildFallbackLadder(@Body() body: Record<string, unknown>) { return this.service.buildFallbackLadder(body.tenantId, body); }
  @Get(':id') async getFont(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getFont(t, id); }
  @Get() async listFonts(@Query('tenantId') t: string) { return this.service.listFonts(t); }
  @Post('register-font') @Audit('internal') async registerFont(@Body() body: Record<string, unknown>) { return this.service.registerFont(body.tenantId, body); }
  @Get(':id') async getShaping(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getShaping(t, id); }
  @Get(':id') async getFallback(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getFallback(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
