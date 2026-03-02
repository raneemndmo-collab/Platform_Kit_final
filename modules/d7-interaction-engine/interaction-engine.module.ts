import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionLayer, NavigationMap, LiveBinding } from './domain/entities';
import { InteractionEngineService } from './application/services/interaction-engine.service';
import { InteractionEngineController } from './api/controllers/interaction-engine.controller';
import { ValidateLinksHandler } from './application/commands/validate-links.handler';
import { MapInteractionsHandler } from './application/commands/map-interactions.handler';
import { GetMapHandler } from './application/queries/get-map.handler';
import { ListMapsHandler } from './application/queries/list-maps.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([InteractionLayer, NavigationMap, LiveBinding], 'd7_connection')],
  controllers: [InteractionEngineController],
  providers: [InteractionEngineService, ValidateLinksHandler, MapInteractionsHandler, GetMapHandler, ListMapsHandler],
  exports: [InteractionEngineService],
})
export class InteractionEngineModule {}
