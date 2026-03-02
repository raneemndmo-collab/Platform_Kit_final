import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M5ProcurementController } from './api/controllers/procurement.controller';
import { M5ProcurementService } from './application/handlers/procurement.service';
import {
import { ApproveOrderHandler } from './application/commands/approve-order.handler';
import { CreateOrderHandler } from './application/commands/create-order.handler';
import { GetOrderHandler } from './application/queries/get-order.handler';
import { ListOrdersHandler } from './application/queries/list-orders.handler';
  VendorEntity, PurchaseOrderEntity, PurchaseOrderLineEntity,
  ApprovalChainEntity, ReceivingNoteEntity, VendorEvaluationEntity,
} from './domain/entities';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([
    VendorEntity, PurchaseOrderEntity, PurchaseOrderLineEntity,
    ApprovalChainEntity, ReceivingNoteEntity, VendorEvaluationEntity,
  ], 'm5_connection')],
  controllers: [M5ProcurementController],
  providers: [M5ProcurementService, ApproveOrderHandler, CreateOrderHandler, GetOrderHandler, ListOrdersHandler],
  exports: [M5ProcurementService],
})
export class M5ProcurementModule {}
