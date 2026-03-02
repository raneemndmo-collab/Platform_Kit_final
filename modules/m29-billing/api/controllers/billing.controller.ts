import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { BillingService } from '../../application/services/billing.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}
  @Post('plans') @Audit('restricted') async createPlan(@Body() body: Record<string, unknown>) { return this.service.createPlan(body.tenantId, body); }
  @Get('plans/active') async activePlan(@Query('tenantId') t: string) { return this.service.getActivePlan(t); }
  @Post('invoices') @Audit('restricted') async generate(@Body() body: Record<string, unknown>) { return this.service.generateInvoice(body.tenantId, body); }
  @Get('invoices') async listInvoices(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listInvoices(t, s); }
  @Get('invoices/overdue') async overdue(@Query('tenantId') t: string) { return this.service.getOverdueInvoices(t); }
  @Post('payments') @Audit('restricted') async pay(@Body() body: Record<string, unknown>) { return this.service.processPayment(body.tenantId, body); }
  @Post('usage') @Audit('internal') async recordUsage(@Body() body: Record<string, unknown>) { return this.service.recordUsage(body.tenantId, body); }
  @Get('usage') async usage(@Query('tenantId') t: string, @Query('period') p: string) { return this.service.getUsageSummary(t, p); }
  @Get('health') async health() { return this.service.health(); }
}
