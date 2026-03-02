import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation , ApiResponse} from '@nestjs/swagger';
import { M3CrmService } from '../../application/handlers/crm.service';
import { Audit } from '../../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@ApiTags('M3: CRM')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/crm')
export class M3CrmController {
  constructor(private readonly service: M3CrmService) {}

  @Get('health')
  health() { return { status: 'healthy', module: 'M3', service: 'CRM', timestamp: new Date() }; }

  @Post('contacts') @Audit('internal')
  createContact(@Body() dto: Record<string, unknown>) { return this.service.createContact(dto.tenantId, dto.userId, dto); }

  @Get('contacts/:id')
  getContact(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getContact(t, id); }

  @Get('contacts/search')
  searchContacts(@Query('tenantId') t: string, @Query('q') q: string) { return this.service.searchContacts(t, q); }

  @Post('leads') @Audit('internal')
  createLead(@Body() dto: Record<string, unknown>) { return this.service.createLead(dto.tenantId, dto.userId, dto); }

  @Post('leads/:id/convert') @Audit('internal')
  @ApiOperation({ summary: 'Convert lead to opportunity' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  convertLead(@Query('tenantId') t: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.convertLead(t, dto.userId, id, dto);
  }

  @Post('opportunities') @Audit('internal')
  createOpportunity(@Body() dto: Record<string, unknown>) { return this.service.createOpportunity(dto.tenantId, dto.userId, dto); }

  @Put('opportunities/:id/stage') @Audit('internal')
  @ApiOperation({ summary: 'Update opportunity stage' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  updateStage(@Query('tenantId') t: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.updateStage(t, dto.userId, id, dto.stage);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get sales pipeline' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  getPipeline(@Query('tenantId') t: string) { return this.service.getPipeline(t); }

  @Post('activities') @Audit('internal')
  logActivity(@Body() dto: Record<string, unknown>) { return this.service.logActivity(dto.tenantId, dto.userId, dto); }

  @Get('activities/:contactId')
  getActivities(@Query('tenantId') t: string, @Param('contactId') cid: string) { return this.service.getActivities(t, cid); }

  @Post('campaigns') @Audit('internal')
  createCampaign(@Body() dto: Record<string, unknown>) { return this.service.createCampaign(dto.tenantId, dto.userId, dto); }

  @Get('campaigns')
  getCampaigns(@Query('tenantId') t: string) { return this.service.getCampaigns(t); }

  @Post('segments') @Audit('internal')
  createSegment(@Body() dto: Record<string, unknown>) { return this.service.createSegment(dto.tenantId, dto.userId, dto); }

  @Get('segments/:id')
  getSegment(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getSegment(t, id); }
}
