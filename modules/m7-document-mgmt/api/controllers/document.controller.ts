import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { DocumentService } from '../../application/services/document.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/documents')
export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  @Post() @Audit('internal')
  async create(@Body() body: Record<string, unknown>) { return this.service.createDocument(body.tenantId, body); }

  @Put(':id') @Audit('internal')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateDocument(body.tenantId, id, body); }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getDocument(t, id); }

  @Get()
  async list(@Query('tenantId') t: string, @Query('folderId') f?: string, @Query('status') s?: string) { return this.service.listDocuments(t, f, s); }

  @Post(':id/submit') @Audit('internal')
  async submit(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.submitForApproval(body.tenantId, id, body.approvers); }

  @Post(':id/approve') @Audit('restricted')
  async approve(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.approveDocument(body.tenantId, id, body.approverId, body.comments); }

  @Post(':id/reject') @Audit('restricted')
  async reject(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.rejectDocument(body.tenantId, id, body.approverId, body.comments); }

  @Post(':id/publish') @Audit('restricted')
  async publish(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.publishDocument(body.tenantId, id); }

  @Post(':id/archive') @Audit('restricted')
  async archive(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.archiveDocument(body.tenantId, id); }

  @Get(':id/versions')
  async versions(@Param('id') id: string, @Query('tenantId') t: string) { return this.service.getVersionHistory(t, id); }

  @Post('folders') @Audit('internal')
  async createFolder(@Body() body: Record<string, unknown>) { return this.service.createFolder(body.tenantId, body); }

  @Get('folders')
  async listFolders(@Query('tenantId') t: string, @Query('parentId') p?: string) { return this.service.listFolders(t, p); }

  @Post('templates') @Audit('internal')
  async createTemplate(@Body() body: Record<string, unknown>) { return this.service.createTemplate(body.tenantId, body); }

  @Get('templates')
  async listTemplates(@Query('tenantId') t: string, @Query('category') c?: string) { return this.service.listTemplates(t, c); }

  @Get('health')
  async health() { return this.service.health(); }
}
