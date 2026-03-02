import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { LegalContractService } from '../../application/services/legal-contract.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/contracts')
export class LegalContractController {
  constructor(private readonly service: LegalContractService) {}

  @Post() @Audit('restricted')
  async create(@Body() b: Record<string, unknown>) { return this.service.createContract(b.tenantId, b); }

  @Put(':id/status') @Audit('restricted')
  async updateStatus(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.updateContractStatus(b.tenantId, id, b.status); }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getContract(t, id); }

  @Get()
  async list(@Query('tenantId') t: string, @Query('status') s?: string, @Query('type') tp?: string) { return this.service.listContracts(t, s, tp); }

  @Post(':id/clauses') @Audit('internal')
  async addClause(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.addClause(b.tenantId, id, b); }

  @Get(':id/clauses')
  async listClauses(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.listClauses(t, id); }

  @Post(':id/obligations') @Audit('internal')
  async addObligation(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.addObligation(b.tenantId, id, b); }

  @Put('obligations/:oid/fulfill') @Audit('restricted')
  async fulfillObligation(@Param('oid') oid: string, @Body() b: Record<string, unknown>) { return this.service.fulfillObligation(b.tenantId, oid); }

  @Get('obligations/upcoming')
  async upcomingObligations(@Query('tenantId') t: string, @Query('days') d?: string) { return this.service.getUpcomingObligations(t, d ? parseInt(d) : 30); }

  @Get('expiring')
  async expiring(@Query('tenantId') t: string, @Query('days') d?: string) { return this.service.getExpiringContracts(t, d ? parseInt(d) : 90); }

  @Post('clause-library') @Audit('restricted')
  async addTemplate(@Body() b: Record<string, unknown>) { return this.service.addClauseTemplate(b.tenantId, b); }

  @Get('clause-library')
  async searchLibrary(@Query('tenantId') t: string, @Query('category') c?: string) { return this.service.searchClauseLibrary(t, c); }

  @Post(':id/amendments') @Audit('restricted')
  async createAmendment(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.service.createAmendment(b.tenantId, id, b); }

  @Get('health')
  async health() { return this.service.health(); }
}
