import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BindingTemplate, DataSourceMapping, RefreshPolicy } from './domain/entities';
import { DataRebindingEngineService } from './application/services/data-rebinding.service';
import { DataRebindingEngineController } from './api/controllers/data-rebinding.controller';
import { ValidateBindingHandler } from './application/commands/validate-binding.handler';
import { RebindDataHandler } from './application/commands/rebind-data.handler';
import { GetConfigHandler } from './application/queries/get-config.handler';
import { ListBindingsHandler } from './application/queries/list-bindings.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([BindingTemplate, DataSourceMapping, RefreshPolicy], 'd12_connection')],
  controllers: [DataRebindingEngineController],
  providers: [DataRebindingEngineService, ValidateBindingHandler, RebindDataHandler, GetConfigHandler, ListBindingsHandler],
  exports: [DataRebindingEngineService],
})
export class DataRebindingEngineModule {}
