import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { PersonalizationService } from '../../application/services/personalization.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/personalization')
export class PersonalizationController {
  constructor(private readonly service: PersonalizationService) {}

  @Get('profile')
  async getProfile(@Query('tenantId') t: string, @Query('userId') u: string) { return this.service.getProfile(t, u); }

  @Put('profile') @Audit('internal')
  async updateProfile(@Body() body: Record<string, unknown>) { return this.service.updateProfile(body.tenantId, body.userId, body); }

  @Post('activity') @Audit('internal')
  async trackActivity(@Body() body: Record<string, unknown>) { return this.service.trackActivity(body.tenantId, body); }

  @Get('activity')
  async recentActivity(@Query('tenantId') t: string, @Query('userId') u: string) { return this.service.getRecentActivity(t, u); }

  @Get('recommendations')
  async recommendations(@Query('tenantId') t: string, @Query('userId') u: string, @Query('category') c: string) { return this.service.generateRecommendations(t, u, c); }

  @Post('recommendations/:id/dismiss') @Audit('internal')
  async dismiss(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.dismissRecommendation(body.tenantId, id); }

  @Get('health')
  async health() { return this.service.health(); }
}
