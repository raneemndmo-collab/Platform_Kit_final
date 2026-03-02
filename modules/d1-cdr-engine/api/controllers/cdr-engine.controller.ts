import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D1: CDR Engine — Controller
// API: /api/v1/cdr/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { CDREngineService } from '../../application/services/cdr-engine.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/cdr')
export class CDREngineController {
  constructor(private readonly service: CDREngineService) {}

  @Post('parse-document') @Audit('internal') async parseDocument(@Body() body: Record<string, unknown>) { return this.service.parseDocument(body.tenantId, body); }
  @Post('validate-c-d-r') @Audit('internal') async validateCDR(@Body() body: Record<string, unknown>) { return this.service.validateCDR(body.tenantId, body); }
  @Get(':id') async getCDR(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getCDR(t, id); }
  @Get(':id') async getCDRByHash(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getCDRByHash(t, id); }
  @Post('update-layer') @Audit('internal') async updateLayer(@Body() body: Record<string, unknown>) { return this.service.updateLayer(body.tenantId, body); }
  @Get() async listParsers(@Query('tenantId') t: string) { return this.service.listParsers(t); }
  @Post('register-parser') @Audit('internal') async registerParser(@Body() body: Record<string, unknown>) { return this.service.registerParser(body.tenantId, body); }
  @Get(':id') async getParseStatus(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getParseStatus(t, id); }
  @Get(':id') async getFidelityReport(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getFidelityReport(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
