import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D10: Translation & Direction Engine — Controller
// API: /api/v1/translate/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { TranslationDirectionEngineService } from '../../application/services/translation-direction.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/translate')
export class TranslationDirectionEngineController {
  constructor(private readonly service: TranslationDirectionEngineService) {}

  @Post('translate-content') @Audit('internal') async translateContent(@Body() body: Record<string, unknown>) { return this.service.translateContent(body.tenantId, body); }
  @Post('mirror-layout') @Audit('internal') async mirrorLayout(@Body() body: Record<string, unknown>) { return this.service.mirrorLayout(body.tenantId, body); }
  @Post('adapt-culture') @Audit('internal') async adaptCulture(@Body() body: Record<string, unknown>) { return this.service.adaptCulture(body.tenantId, body); }
  @Get(':id') async getTranslation(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getTranslation(t, id); }
  @Get(':id') async getMirrorResult(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getMirrorResult(t, id); }
  @Get(':id') async getDirectionProfile(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getDirectionProfile(t, id); }
  @Get() async listCulturalRules(@Query('tenantId') t: string) { return this.service.listCulturalRules(t); }
  @Get('health') async health() { return this.service.health(); }
}
