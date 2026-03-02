import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Query , UseGuards} from '@nestjs/common';
import { NLPService } from '../../application/services/nlp.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/nlp')
export class NLPController {
  constructor(private readonly service: NLPService) {}

  @Post('process') @Audit('internal')
  async process(@Body() b: Record<string, unknown>) { return this.service.processText(b.tenantId, b); }

  @Post('sentiment') @Audit('internal')
  async sentiment(@Body() b: Record<string, unknown>) { return this.service.sentiment(b.tenantId, b.text, b.source); }

  @Post('entities') @Audit('internal')
  async entities(@Body() b: Record<string, unknown>) { return this.service.extractEntities(b.tenantId, b.text, b.source); }

  @Post('classify') @Audit('internal')
  async classify(@Body() b: Record<string, unknown>) { return this.service.classify(b.tenantId, b.text, b.source); }

  @Post('translate') @Audit('internal')
  async translate(@Body() b: Record<string, unknown>) { return this.service.translate(b.tenantId, b.text, b.targetLang, b.source); }

  @Post('summarize') @Audit('internal')
  async summarize(@Body() b: Record<string, unknown>) { return this.service.summarize(b.tenantId, b.text, b.source); }

  @Post('models') @Audit('restricted')
  async registerModel(@Body() b: Record<string, unknown>) { return this.service.registerModel(b.tenantId, b); }

  @Post('training-data') @Audit('internal')
  async addTraining(@Body() b: Record<string, unknown>) { return this.service.addTrainingData(b.tenantId, b); }

  @Get('health')
  async health() { return this.service.health(); }
}
