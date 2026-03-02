import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Delete, Body, Param, Query , UseGuards} from '@nestjs/common';
import { SearchService } from '../../application/services/search.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Post('indices') @Audit('internal')
  async createIndex(@Body() body: Record<string, unknown>) { return this.service.createIndex(body.tenantId, body); }

  @Get('indices')
  async listIndices(@Query('tenantId') t: string) { return this.service.listIndices(t); }

  @Post('index') @Audit('internal')
  async indexDoc(@Body() body: Record<string, unknown>) { return this.service.indexDocument(body.tenantId, body); }

  @Delete('index/:entityType/:entityId') @Audit('internal')
  async removeDoc(@Param('entityType') et: string, @Param('entityId') ei: string, @Query('tenantId') t: string) { return this.service.removeDocument(t, et, ei); }

  @Post('query') @Audit('internal')
  async search(@Body() body: Record<string, unknown>) { return this.service.search(body.tenantId, body); }

  @Post('click') @Audit('internal')
  async trackClick(@Body() body: Record<string, unknown>) { return this.service.trackClick(body.tenantId, body); }

  @Get('popular')
  async popular(@Query('tenantId') t: string) { return this.service.getPopularSearches(t); }

  @Get('precision')
  async precision(@Query('tenantId') t: string) { return this.service.getSearchPrecision(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
