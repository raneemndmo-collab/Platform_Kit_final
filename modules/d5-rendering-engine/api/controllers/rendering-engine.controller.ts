import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D5: Rendering Engine — Controller
// API: /api/v1/render/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { RenderingEngineService } from '../../application/services/rendering-engine.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/render')
export class RenderingEngineController {
  constructor(private readonly service: RenderingEngineService) {}

  @Post('render-to-format') @Audit('internal') async renderToFormat(@Body() body: Record<string, unknown>) { return this.service.renderToFormat(body.tenantId, body); }
  @Post('render-preview') @Audit('internal') async renderPreview(@Body() body: Record<string, unknown>) { return this.service.renderPreview(body.tenantId, body); }
  @Post('batch-render') @Audit('internal') async batchRender(@Body() body: Record<string, unknown>) { return this.service.batchRender(body.tenantId, body); }
  @Get(':id') async getRender(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getRender(t, id); }
  @Get(':id') async getArtifact(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getArtifact(t, id); }
  @Get(':id') async getCacheStatus(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getCacheStatus(t, id); }
  @Get() async listRenderers(@Query('tenantId') t: string) { return this.service.listRenderers(t); }
  @Post('register-renderer') @Audit('internal') async registerRenderer(@Body() body: Record<string, unknown>) { return this.service.registerRenderer(body.tenantId, body); }
  @Get('health') async health() { return this.service.health(); }
}
