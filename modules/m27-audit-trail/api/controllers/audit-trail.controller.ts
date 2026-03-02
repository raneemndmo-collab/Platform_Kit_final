import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Query , UseGuards} from '@nestjs/common';
import { AuditTrailService } from '../../application/services/audit-trail.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/audit')
export class AuditTrailController {
  constructor(private readonly service: AuditTrailService) {}
  @Post('log') @Audit('internal') async log(@Body() body: Record<string, unknown>) { return this.service.logEntry(body.tenantId, body); }
  @Post('query') @Audit('internal') async query(@Body() body: Record<string, unknown>) { return this.service.queryAuditLog(body.tenantId, body); }
  @Get('entity-history') async entityHistory(@Query('tenantId') t: string, @Query('entityType') et: string, @Query('entityId') ei: string) { return this.service.getEntityHistory(t, et, ei); }
  @Get('user-activity') async userActivity(@Query('tenantId') t: string, @Query('userId') u: string) { return this.service.getUserActivity(t, u); }
  @Post('retention-policy') @Audit('restricted') async setRetention(@Body() body: Record<string, unknown>) { return this.service.setRetentionPolicy(body.tenantId, body); }
  @Get('retention-policies') async getRetention(@Query('tenantId') t: string) { return this.service.getRetentionPolicies(t); }
  @Post('retention/apply') @Audit('restricted') async applyRetention(@Body() body: Record<string, unknown>) { return this.service.applyRetention(body.tenantId); }
  @Post('export') @Audit('restricted') async export(@Body() body: Record<string, unknown>) { return this.service.exportAuditLog(body.tenantId, body); }
  @Get('health') async health() { return this.service.health(); }
}
