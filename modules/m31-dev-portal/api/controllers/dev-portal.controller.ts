import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Delete, Body, Param, Query , UseGuards} from '@nestjs/common';
import { DevPortalService } from '../../application/services/dev-portal.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/developer')
export class DevPortalController {
  constructor(private readonly service: DevPortalService) {}
  @Post('keys') @Audit('restricted') async generateKey(@Body() body: Record<string, unknown>) { return this.service.generateApiKey(body.tenantId, body); }
  @Get('keys') async listKeys(@Query('tenantId') t: string) { return this.service.listApiKeys(t); }
  @Delete('keys/:id') @Audit('restricted') async revokeKey(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.revokeApiKey(body.tenantId, id); }
  @Post('keys/:id/rotate') @Audit('restricted') async rotateKey(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.rotateApiKey(body.tenantId, id); }
  @Post('docs') @Audit('internal') async publishDocs(@Body() body: Record<string, unknown>) { return this.service.publishDocs(body.tenantId, body); }
  @Get('docs') async listDocs(@Query('tenantId') t: string) { return this.service.listDocs(t); }
  @Get('docs/:moduleId') async getDocs(@Param('moduleId') m: string, @Query('tenantId') t: string, @Query('version') v?: string) { return this.service.getDocs(t, m, v); }
  @Post('sandboxes') @Audit('restricted') async createSandbox(@Body() body: Record<string, unknown>) { return this.service.createSandbox(body.tenantId, body); }
  @Get('sandboxes') async listSandboxes(@Query('tenantId') t: string) { return this.service.listSandboxes(t); }
  @Get('usage') async usage(@Query('tenantId') t: string, @Query('apiKeyId') k?: string) { return this.service.getApiUsageStats(t, k); }
  @Get('health') async health() { return this.service.health(); }
}
