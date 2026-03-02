import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Query , UseGuards} from '@nestjs/common';
import { VisionService } from '../../application/services/vision.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/vision')
export class VisionController {
  constructor(private readonly service: VisionService) {}

  @Post('process') @Audit('internal')
  async process(@Body() b: Record<string, unknown>) { return this.service.processImage(b.tenantId, b); }

  @Post('ocr') @Audit('internal')
  async ocr(@Body() b: Record<string, unknown>) { return this.service.ocr(b.tenantId, b.fileId, b.source); }

  @Post('detect') @Audit('internal')
  async detect(@Body() b: Record<string, unknown>) { return this.service.detectObjects(b.tenantId, b.fileId, b.source); }

  @Post('analyze-document') @Audit('internal')
  async analyze(@Body() b: Record<string, unknown>) { return this.service.analyzeDocument(b.tenantId, b.fileId, b.source); }

  @Post('models') @Audit('restricted')
  async registerModel(@Body() b: Record<string, unknown>) { return this.service.registerModel(b.tenantId, b); }

  @Get('health')
  async health() { return this.service.health(); }
}
