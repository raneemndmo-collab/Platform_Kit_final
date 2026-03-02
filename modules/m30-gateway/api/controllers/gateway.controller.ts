// =============================================================================
// M30: API Gateway — API Controller
// Constitutional: ACT-003 (routes via Action Registry), COM-003 (all via gateway)
// =============================================================================

import { Controller, Get, Post, Body, Query, Param, HttpCode , UseGuards} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth , ApiResponse} from '@nestjs/swagger';
import { M30GatewayService } from '../../application/handlers/gateway.service';
import { Audit } from '../../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@ApiTags('M30: API Gateway')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/gateway')
export class M30GatewayController {
  constructor(private readonly service: M30GatewayService) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  health() {
    return { status: 'healthy', module: 'M30', service: 'API Gateway', timestamp: new Date() };
  }

  @Post('routes') @Audit('internal')
  @ApiOperation({ summary: 'Register route (ACT-003)' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  registerRoute(@Body() dto: Record<string, unknown>) {
    return this.service.registerRoute(dto.tenantId, dto.userId, dto);
  }

  @Get('routes')
  @ApiOperation({ summary: 'List registered routes' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  getRoutes(@Query('tenantId') tenantId: string, @Query('moduleId') moduleId?: string) {
    return this.service.getRoutes(tenantId, moduleId);
  }

  @Post('routes/resolve') @Audit('internal')
  @ApiOperation({ summary: 'Resolve route for incoming request' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  resolveRoute(@Body() dto: { tenantId: string; method: string; path: string }) {
    return this.service.resolveRoute(dto.tenantId, dto.method, dto.path);
  }

  @Post('rate-limits') @Audit('internal')
  @ApiOperation({ summary: 'Create rate limit policy' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  createRateLimit(@Body() dto: Record<string, unknown>) {
    return this.service.createRateLimitPolicy(dto.tenantId, dto.userId, dto);
  }

  @Post('api-keys') @Audit('restricted')
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  createApiKey(@Body() dto: Record<string, unknown>) {
    return this.service.createApiKey(dto.tenantId, dto.userId, dto);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get gateway analytics' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  getAnalytics(@Query('tenantId') tenantId: string, @Query('moduleId') moduleId?: string) {
    return this.service.getAnalytics(tenantId, moduleId);
  }
}
