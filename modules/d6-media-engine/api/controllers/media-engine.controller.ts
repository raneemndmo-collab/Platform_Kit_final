import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D6: Media Engine — Controller
// API: /api/v1/media/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { MediaEngineService } from '../../application/services/media-engine.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/media')
export class MediaEngineController {
  constructor(private readonly service: MediaEngineService) {}

  @Post('generate-image') @Audit('internal') async generateImage(@Body() body: Record<string, unknown>) { return this.service.generateImage(body.tenantId, body); }
  @Post('compose-video') @Audit('internal') async composeVideo(@Body() body: Record<string, unknown>) { return this.service.composeVideo(body.tenantId, body); }
  @Post('synthesize-voice') @Audit('internal') async synthesizeVoice(@Body() body: Record<string, unknown>) { return this.service.synthesizeVoice(body.tenantId, body); }
  @Get(':id') async getAsset(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getAsset(t, id); }
  @Get() async listAssets(@Query('tenantId') t: string) { return this.service.listAssets(t); }
  @Get(':id') async getComposition(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getComposition(t, id); }
  @Get(':id') async getGenerationStatus(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getGenerationStatus(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
