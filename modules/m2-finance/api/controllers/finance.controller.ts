import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation , ApiResponse} from '@nestjs/swagger';
import { M2FinanceService } from '../../application/handlers/finance.service';
import { Audit } from '../../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@ApiTags('M2: Finance')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/finance')
export class M2FinanceController {
  constructor(private readonly service: M2FinanceService) {}

  @Get('health')
  health() { return { status: 'healthy', module: 'M2', service: 'Finance', timestamp: new Date() }; }

  @Post('accounts') @Audit('restricted')
  createAccount(@Body() dto: Record<string, unknown>) { return this.service.createAccount(dto.tenantId, dto.userId, dto); }

  @Get('accounts')
  getAccounts(@Query('tenantId') t: string, @Query('type') type?: string) { return this.service.getAccounts(t, type); }

  @Post('invoices') @Audit('restricted')
  createInvoice(@Body() dto: Record<string, unknown>) { return this.service.createInvoice(dto.tenantId, dto.userId, dto); }

  @Post('invoices/:id/approve') @Audit('restricted')
  approveInvoice(@Query('tenantId') t: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.approveInvoice(t, dto.userId, id);
  }

  @Get('invoices')
  listInvoices(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listInvoices(t, s); }

  @Get('invoices/:id')
  getInvoice(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getInvoice(t, id); }

  @Post('payments') @Audit('restricted')
  recordPayment(@Body() dto: Record<string, unknown>) { return this.service.recordPayment(dto.tenantId, dto.userId, dto); }

  @Post('budgets') @Audit('restricted')
  allocateBudget(@Body() dto: Record<string, unknown>) { return this.service.allocateBudget(dto.tenantId, dto.userId, dto); }

  @Get('budgets')
  getBudgetStatus(@Query('tenantId') t: string, @Query('year') y?: string) { return this.service.getBudgetStatus(t, y); }

  @Get('ledger')
  getLedger(@Query('tenantId') t: string, @Query('accountId') a?: string, @Query('period') p?: string) {
    return this.service.getLedger(t, a, p);
  }
}
