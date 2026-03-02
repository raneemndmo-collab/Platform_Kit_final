import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M4InventoryController } from './api/controllers/inventory.controller';
import { M4InventoryService } from './application/handlers/inventory.service';
import { ItemEntity, StockLevelEntity, WarehouseEntity, StockMovementEntity, StockValuationEntity } from './domain/entities';
import { CreateItemHandler } from './application/commands/create-item.handler';
import { AdjustStockHandler } from './application/commands/adjust-stock.handler';
import { ListItemsHandler } from './application/queries/list-items.handler';
import { GetItemHandler } from './application/queries/get-item.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ItemEntity, StockLevelEntity, WarehouseEntity, StockMovementEntity, StockValuationEntity], 'm4_connection')],
  controllers: [M4InventoryController],
  providers: [M4InventoryService, CreateItemHandler, AdjustStockHandler, ListItemsHandler, GetItemHandler],
  exports: [M4InventoryService],
})
export class M4InventoryModule {}
