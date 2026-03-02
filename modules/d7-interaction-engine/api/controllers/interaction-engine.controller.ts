import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D7: Interaction Engine — Controller
// API: /api/v1/interact/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { InteractionEngineService } from '../../application/services/interaction-engine.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/interact')
export class InteractionEngineController {
  constructor(private readonly service: InteractionEngineService) {}

  @Post('generate-interactions') @Audit('internal') async generateInteractions(@Body() body: Record<string, unknown>) { return this.service.generateInteractions(body.tenantId, body); }
  @Post('create-navigation') @Audit('internal') async createNavigation(@Body() body: Record<string, unknown>) { return this.service.createNavigation(body.tenantId, body); }
  @Post('bind-live-data') @Audit('internal') async bindLiveData(@Body() body: Record<string, unknown>) { return this.service.bindLiveData(body.tenantId, body); }
  @Get(':id') async getInteractions(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getInteractions(t, id); }
  @Get(':id') async getNavigation(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getNavigation(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
