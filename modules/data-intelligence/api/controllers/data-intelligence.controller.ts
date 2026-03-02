import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Get, Body, Param, Query , UseGuards} from '@nestjs/common';
import { DataIntelligenceService } from '../../application/services/data-intelligence.service';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';

@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/data-intelligence')
export class DataIntelligenceController {
  constructor(private readonly service: DataIntelligenceService) {}
  @Post('models/infer') infer(@Body() body: Record<string, unknown>) { return this.service.inferModel(body.tenantId, body); }
  @Post('models/:id/metrics') metrics(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.deriveMetrics(body.tenantId, id); }
  @Post('predict') predict(@Body() body: Record<string, unknown>) { return this.service.predict(body.tenantId, body); }
  @Post('query/optimize') optimize(@Body() body: Record<string, unknown>) { return this.service.optimizeQuery(body.tenantId, body.query); }
  @Get('health') health() { return this.service.health(); }
}
