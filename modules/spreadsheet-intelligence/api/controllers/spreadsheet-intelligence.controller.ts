import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Get, Body , UseGuards} from '@nestjs/common';
import { SpreadsheetIntelligenceService } from '../../application/services/spreadsheet-intelligence.service';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';

@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/spreadsheet-intelligence')
export class SpreadsheetIntelligenceController {
  constructor(private readonly service: SpreadsheetIntelligenceService) {}
  @Post('formula/infer') infer(@Body() body: Record<string, unknown>) { return this.service.inferFormula(body.tenantId, body); }
  @Post('pattern/recognize') recognize(@Body() body: Record<string, unknown>) { return this.service.recognizePattern(body.tenantId, body); }
  @Post('pivot/reconstruct') pivot(@Body() body: Record<string, unknown>) { return this.service.reconstructPivot(body.tenantId, body); }
  @Post('precision/check') precision(@Body() body: Record<string, unknown>) { return this.service.checkPrecision(body.tenantId, body); }
  @Get('health') health() { return this.service.health(); }
}
