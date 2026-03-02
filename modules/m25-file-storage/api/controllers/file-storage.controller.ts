import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// M25: File Storage - API Controller
import { Controller, Get, Post, Delete, Body, Param, Query , UseGuards} from '@nestjs/common';
import { FileStorageService } from '../application/services/file-storage.service';
import { Audit } from '../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/files')
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  @Post('upload')
  @Audit('internal')
  async upload(@Body() body: Record<string, unknown>) { return this.service.uploadFile(body.tenantId, body); }

  @Get(':id')
  async getFile(@Param('id') id: string, @Query('tenantId') tenantId: string) { return this.service.getFile(tenantId, id); }

  @Get()
  async listFiles(@Query('tenantId') tenantId: string, @Query('folderId') folderId?: string) { return this.service.listFiles(tenantId, folderId); }

  @Post(':id/versions')
  @Audit('internal')
  async createVersion(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.createVersion(body.tenantId, id, body); }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string, @Query('tenantId') tenantId: string) { return this.service.getVersionHistory(tenantId, id); }

  @Delete(':id')
  @Audit('restricted')
  async deleteFile(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.deleteFile(body.tenantId, id, body.userId); }

  @Post(':id/scan-complete')
  @Audit('internal')
  async completeScan(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.completeScan(body.tenantId, id, body); }

  @Get('health')
  async health() { return this.service.health(); }
}
