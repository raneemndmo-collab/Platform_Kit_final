import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation , ApiResponse} from '@nestjs/swagger';
import { M4InventoryService } from '../../application/handlers/inventory.service';
import { Audit } from '../../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@ApiTags('M4: Inventory')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/inventory')
export class M4InventoryController {
  constructor(private readonly service: M4InventoryService) {}

  @Get('health')
  health() { return { status: 'healthy', module: 'M4', service: 'Inventory', timestamp: new Date() }; }

  @Post('items') @Audit('internal')
  createItem(@Body() dto: Record<string, unknown>) { return this.service.createItem(dto.tenantId, dto.userId, dto); }

  @Get('items')
  listItems(@Query('tenantId') t: string, @Query('category') c?: string) { return this.service.listItems(t, c); }

  @Get('items/:id')
  getItem(@Query('tenantId') t: string, @Param('id') id: string) { return this.service.getItem(t, id); }

  @Post('warehouses') @Audit('internal')
  createWarehouse(@Body() dto: Record<string, unknown>) { return this.service.createWarehouse(dto.tenantId, dto.userId, dto); }

  @Get('warehouses')
  getWarehouses(@Query('tenantId') t: string) { return this.service.getWarehouses(t); }

  @Post('stock/receive') @Audit('internal')
  @ApiOperation({ summary: 'Receive stock into warehouse' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  receiveStock(@Body() dto: Record<string, unknown>) { return this.service.receiveStock(dto.tenantId, dto.userId, dto); }

  @Post('stock/issue') @Audit('internal')
  @ApiOperation({ summary: 'Issue stock from warehouse' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  issueStock(@Body() dto: Record<string, unknown>) { return this.service.issueStock(dto.tenantId, dto.userId, dto); }

  @Post('stock/transfer') @Audit('internal')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  transferStock(@Body() dto: Record<string, unknown>) { return this.service.transferStock(dto.tenantId, dto.userId, dto); }

  @Post('stock/adjust') @Audit('internal')
  @ApiOperation({ summary: 'Adjust stock quantity' })
  @ApiResponse({ status: 200, description: 'نجاح العملية' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  @ApiResponse({ status: 404, description: 'غير موجود' })
  adjustStock(@Body() dto: Record<string, unknown>) { return this.service.adjustStock(dto.tenantId, dto.userId, dto); }

  @Put('stock/reorder-level') @Audit('internal')
  setReorderLevel(@Body() dto: Record<string, unknown>) {
    return this.service.setReorderLevel(dto.tenantId, dto.userId, dto.itemId, dto.warehouseId, dto.level, dto.quantity);
  }

  @Get('stock/levels')
  getStockLevels(@Query('tenantId') t: string, @Query('warehouseId') w?: string) { return this.service.getStockLevels(t, w); }

  @Get('stock/movements/:itemId')
  getMovementHistory(@Query('tenantId') t: string, @Param('itemId') id: string) { return this.service.getMovementHistory(t, id); }

  @Get('valuation')
  getValuation(@Query('tenantId') t: string, @Query('itemId') i?: string) { return this.service.getValuation(t, i); }
}
