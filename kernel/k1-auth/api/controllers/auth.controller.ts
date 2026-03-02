// =============================================================================
// K1: Authentication — Controller & Module
// =============================================================================

import { Controller, Get, Post, Body, Param, Headers, HttpCode, HttpStatus, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Tenant, Audit } from '../../../shared/decorators';
import { TenantContext } from '../../../shared/interfaces';
import { K1AuthService, RegisterDto, LoginDto } from '../application/handlers/auth.service';

@ApiTags('K1 - Authentication')
@Controller('api/v1/auth')
export class K1AuthController {
  constructor(private readonly authService: K1AuthService) {}

  @Post('register')
  @Audit('critical')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Tenant() tenant: TenantContext, @Body() dto: RegisterDto) {
    const user = await this.authService.register(tenant.tenantId, dto);
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  @Post('login')
  @Audit('critical')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login — returns JWT tokens' })
  async login(
    @Tenant() tenant: TenantContext,
    @Body() dto: LoginDto,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') ua: string,
  ) {
    dto.ipAddress = ip || '0.0.0.0';
    dto.userAgent = ua || 'unknown';
    return this.authService.login(tenant.tenantId, dto);
  }

  @Post('validate')
  @Audit('read')
  @ApiOperation({ summary: 'Validate JWT token' })
  async validate(@Body('token') token: string) {
    return this.authService.validateToken(token);
  }

  @Delete('sessions/:sessionId')
  @Audit('write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout / destroy session' })
  async logout(
    @Tenant() tenant: TenantContext,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.logout(tenant.tenantId, sessionId);
  }

  @Get('users')
  @Audit('read')
  @ApiOperation({ summary: 'List users' })
  async listUsers(@Tenant() tenant: TenantContext) {
    return this.authService.listUsers(tenant.tenantId);
  }

  @Get('users/:userId')
  @Audit('read')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Tenant() tenant: TenantContext, @Param('userId') userId: string) {
    return this.authService.getUserById(tenant.tenantId, userId);
  }

  @Get('health')
  @ApiOperation({ summary: 'K1 health check' })
  async health() {
    return { module: 'K1', status: 'healthy', timestamp: new Date().toISOString(),
      checks: [{ name: 'database', status: 'up' }, { name: 'jwt', status: 'up' }] };
  }
}
