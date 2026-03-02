import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Query , UseGuards} from '@nestjs/common';
import { DecisionService } from '../../application/services/decision.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/decisions')
export class DecisionController {
  constructor(private readonly service: DecisionService) {}

  @Post('rules') @Audit('internal')
  async createRule(@Body() b: Record<string, unknown>) { return this.service.createRule(b.tenantId, b); }

  @Post('evaluate') @Audit('internal')
  async evaluate(@Body() b: Record<string, unknown>) { return this.service.evaluate(b.tenantId, b); }

  @Get('rules')
  async listRules(@Query('tenantId') t: string, @Query('ruleSet') r?: string) { return this.service.listRules(t, r); }

  @Get('health')
  async health() { return this.service.health(); }
}
