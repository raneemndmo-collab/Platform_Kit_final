import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D12: Data Rebinding Engine — Controller
// API: /api/v1/rebind/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { DataRebindingEngineService } from '../../application/services/data-rebinding.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/rebind')
export class DataRebindingEngineController {
  constructor(private readonly service: DataRebindingEngineService) {}

  @Post('bind-data') @Audit('internal') async bindData(@Body() body: Record<string, unknown>) { return this.service.bindData(body.tenantId, body); }
  @Post('map-schema') @Audit('internal') async mapSchema(@Body() body: Record<string, unknown>) { return this.service.mapSchema(body.tenantId, body); }
  @Post('refresh-binding') @Audit('internal') async refreshBinding(@Body() body: Record<string, unknown>) { return this.service.refreshBinding(body.tenantId, body); }
  @Get(':id') async getBinding(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getBinding(t, id); }
  @Get(':id') async getSchemaMap(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getSchemaMap(t, id); }
  @Get(':id') async getRefreshStatus(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getRefreshStatus(t, id); }
  @Post('create-template') @Audit('internal') async createTemplate(@Body() body: Record<string, unknown>) { return this.service.createTemplate(body.tenantId, body); }
  @Get() async listTemplates(@Query('tenantId') t: string) { return this.service.listTemplates(t); }
  @Get('health') async health() { return this.service.health(); }
}
