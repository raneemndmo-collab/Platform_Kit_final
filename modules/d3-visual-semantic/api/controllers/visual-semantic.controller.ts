import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D3: Visual Semantic Model — Controller
// API: /api/v1/vsm/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { VisualSemanticModelService } from '../../application/services/visual-semantic.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/vsm')
export class VisualSemanticModelController {
  constructor(private readonly service: VisualSemanticModelService) {}

  @Post('classify-elements') @Audit('internal') async classifyElements(@Body() body: Record<string, unknown>) { return this.service.classifyElements(body.tenantId, body); }
  @Post('score-hierarchy') @Audit('internal') async scoreHierarchy(@Body() body: Record<string, unknown>) { return this.service.scoreHierarchy(body.tenantId, body); }
  @Post('extract-intent') @Audit('internal') async extractIntent(@Body() body: Record<string, unknown>) { return this.service.extractIntent(body.tenantId, body); }
  @Get(':id') async getClassification(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getClassification(t, id); }
  @Get(':id') async getHierarchy(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getHierarchy(t, id); }
  @Get(':id') async getIntent(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getIntent(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
