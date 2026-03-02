import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { KnowledgeGraphService } from '../../application/services/knowledge-graph.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly service: KnowledgeGraphService) {}

  @Post('nodes') @Audit('internal')
  async addNode(@Body() b: Record<string, unknown>) { return this.service.addNode(b.tenantId, b); }

  @Post('edges') @Audit('internal')
  async addEdge(@Body() b: Record<string, unknown>) { return this.service.addEdge(b.tenantId, b); }

  @Get('nodes/:id')
  async getNode(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getNode(t, id); }

  @Get('nodes/:id/neighbors')
  async neighbors(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getNeighbors(t, id); }

  @Get('path')
  async findPath(@Query('tenantId') t: string, @Query('from') f: string, @Query('to') to: string) { return this.service.findPath(t, f, to); }

  @Get('search')
  async search(@Query('tenantId') t: string, @Query('q') q: string, @Query('type') type?: string) { return this.service.searchNodes(t, q, type); }

  @Get('modules/:mod/subgraph')
  async subgraph(@Param('mod') mod: string, @Query('tenantId') t: string) { return this.service.getModuleSubgraph(t, mod); }

  @Get('stats')
  async stats(@Query('tenantId') t: string) { return this.service.getStats(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
