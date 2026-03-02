import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { AIOrchestrationService } from '../../application/services/ai-orchestration.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/ai')
export class AIOrchestrationController {
  constructor(private readonly service: AIOrchestrationService) {}

  @Post('models') @Audit('restricted')
  async registerModel(@Body() b: Record<string, unknown>) { return this.service.registerModel(b.tenantId, b); }

  @Post('models/hot-swap') @Audit('restricted')
  async hotSwap(@Body() b: Record<string, unknown>) { return this.service.hotSwapModel(b.tenantId, b.oldModelId, b.newModelId); }

  @Get('models')
  async listModels(@Query('tenantId') t: string, @Query('capability') c?: string) { return this.service.listModels(t, c); }

  @Post('inference') @Audit('internal')
  async inference(@Body() b: Record<string, unknown>) { return this.service.inference(b.tenantId, b); }

  @Post('containment/rules') @Audit('restricted')
  async addRule(@Body() b: Record<string, unknown>) { return this.service.addContainmentRule(b.tenantId, b); }

  @Post('fallback-chains') @Audit('restricted')
  async configChain(@Body() b: Record<string, unknown>) { return this.service.configureFallbackChain(b.tenantId, b); }

  @Post('capabilities') @Audit('restricted')
  async registerCap(@Body() b: Record<string, unknown>) { return this.service.registerCapability(b.tenantId, b); }

  @Get('capabilities')
  async listCaps(@Query('tenantId') t: string) { return this.service.listCapabilities(t); }

  @Get('health')
  async health() { return this.service.health(); }
}
