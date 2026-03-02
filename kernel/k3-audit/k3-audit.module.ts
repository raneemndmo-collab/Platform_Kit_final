import { Module, Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditRecordEntity } from './domain/entities';
import { K3AuditService, CreateAuditDto } from './application/handlers/audit.service';
import { Tenant, Audit } from '../../shared/decorators';
import { TenantContext } from '../../shared/interfaces';

@ApiTags('K3 - Audit')
@Controller('api/v1/audit')
class K3AuditController {
  constructor(private readonly svc: K3AuditService) {}

  @Post('records')
  @ApiOperation({ summary: 'Record audit event (P-017)' })
  async record(@Body() dto: CreateAuditDto) { return this.svc.record(dto); }

  @Get('search')
  @Audit('read')
  async search(@Tenant() t: TenantContext, @Query('userId') userId?: string,
    @Query('moduleId') moduleId?: string, @Query('page') page?: string) {
    return this.svc.search(t.tenantId, { userId, moduleId }, parseInt(page || '1', 10));
  }

  @Get('timeline/:resourceType/:resourceId')
  @Audit('read')
  async timeline(@Tenant() t: TenantContext, @Param('resourceType') rt: string, @Param('resourceId') rid: string) {
    return this.svc.getTimeline(t.tenantId, rt, rid);
  }

  @Get('health')
  async health() { return { module: 'K3', status: 'healthy', timestamp: new Date().toISOString() }; }
}

@Module({
  imports: [TypeOrmModule.forFeature([AuditRecordEntity], 'k3_connection')],
  controllers: [K3AuditController],
  providers: [K3AuditService],
  exports: [K3AuditService],
})
export class K3AuditModule {}
