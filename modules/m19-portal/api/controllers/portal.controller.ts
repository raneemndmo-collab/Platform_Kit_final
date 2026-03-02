import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { PortalService } from '../../application/services/portal.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Post('pages') @Audit('internal')
  async createPage(@Body() body: Record<string, unknown>) { return this.service.createPage(body.tenantId, body); }

  @Get('pages/:slug')
  async getPage(@Param('slug') slug: string, @Query('tenantId') t: string) { return this.service.getPage(t, slug); }

  @Get('pages')
  async listPages(@Query('tenantId') t: string) { return this.service.listPages(t); }

  @Post('pages/:id/publish') @Audit('restricted')
  async publish(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.publishPage(body.tenantId, id); }

  @Post('themes') @Audit('internal')
  async setTheme(@Body() body: Record<string, unknown>) { return this.service.setTheme(body.tenantId, body); }

  @Get('themes/active')
  async activeTheme(@Query('tenantId') t: string) { return this.service.getActiveTheme(t); }

  @Post('menus') @Audit('internal')
  async createMenu(@Body() body: Record<string, unknown>) { return this.service.createMenu(body.tenantId, body); }

  @Get('menus')
  async menus(@Query('tenantId') t: string, @Query('location') l?: string) { return this.service.getMenus(t, l); }

  @Get('health')
  async health() { return this.service.health(); }
}
