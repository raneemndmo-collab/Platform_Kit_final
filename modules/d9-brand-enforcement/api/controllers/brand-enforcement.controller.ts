import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// ═══════════════════════════════════════════════════════════════════════
// D9: Brand Enforcement Engine — Controller
// API: /api/v1/brand/* | Constitutional: API-004, TXD-001
// ═══════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { BrandEnforcementEngineService } from '../../application/services/brand-enforcement.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/brand')
export class BrandEnforcementEngineController {
  constructor(private readonly service: BrandEnforcementEngineService) {}

  @Post('create-brand-pack') @Audit('internal') async createBrandPack(@Body() body: Record<string, unknown>) { return this.service.createBrandPack(body.tenantId, body); }
  @Get(':id') async getBrandPack(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getBrandPack(t, id); }
  @Get() async listBrandPacks(@Query('tenantId') t: string) { return this.service.listBrandPacks(t); }
  @Post('validate-brand') @Audit('internal') async validateBrand(@Body() body: Record<string, unknown>) { return this.service.validateBrand(body.tenantId, body); }
  @Post('enforce-palette') @Audit('internal') async enforcePalette(@Body() body: Record<string, unknown>) { return this.service.enforcePalette(body.tenantId, body); }
  @Get(':id') async getComplianceReport(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getComplianceReport(t, id); }
  @Get('health') async health() { return this.service.health(); }
}
