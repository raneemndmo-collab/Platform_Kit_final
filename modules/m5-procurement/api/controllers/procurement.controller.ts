import { Controller, Get, Post, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation , ApiResponse} from '@nestjs/swagger';
import { M5ProcurementService } from '../../application/handlers/procurement.service';
import { Audit } from '../../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@ApiTags('M5: Procurement')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/procurement')
export class M5ProcurementController {
  constructor(private readonly service: M5ProcurementService) {}

  @Get('health')
  health() { return { status: 'healthy', module: 'M5', service: 'Procurement', timestamp: new Date() }; }

  @Post('vendors') @Audit('internal')
  onboardVendor(@Body() dto: Record<string, unknown>) { return this.service.onboardVendor(dto.tenantId, dto.userId, dto); }

  @Get('vendors')
  listVendors(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listVendors(t, s); }

  @Get('vendors/:id')
  getVendor(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getVendor(t, id); }

  @Post('vendors/:id/evaluate') @Audit('internal')
  evaluateVendor(@Query('tenantId') t: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.evaluateVendor(t, dto.userId, { ...dto, vendorId: id });
  }

  @Post('orders') @Audit('restricted')
  @ApiOperation({ summary: 'Create purchase order' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  createPO(@Body() dto: Record<string, unknown>) { return this.service.createPO(dto.tenantId, dto.userId, dto); }

  @Post('orders/:id/approve') @Audit('restricted')
  approvePO(@Query('tenantId') t: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.approvePO(t, dto.approverId, id);
  }

  @Get('orders')
  listPOs(@Query('tenantId') t: string, @Query('status') s?: string) { return this.service.listPOs(t, s); }

  @Get('orders/:id')
  getPO(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getPO(t, id); }

  @Post('orders/:id/receive') @Audit('internal')
  @ApiOperation({ summary: 'Receive goods against PO' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  receiveGoods(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.service.receiveGoods(dto.tenantId, dto.userId, { ...dto, purchaseOrderId: id });
  }

  @Get('approvals/:referenceId')
  getApprovalStatus(@Query('tenantId') t: string, @Param('referenceId') ref: string) {
    return this.service.getApprovalStatus(t, ref);
  }
}
