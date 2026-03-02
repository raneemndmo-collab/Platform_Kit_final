import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LayoutGrid, LayoutContainer, ConstraintSet } from './domain/entities';
import { LayoutGraphEngineService } from './application/services/layout-graph.service';
import { LayoutGraphEngineController } from './api/controllers/layout-graph.controller';
import { ExtractGridHandler } from './application/commands/extract-grid.handler';
import { AnalyzeLayoutHandler } from './application/commands/analyze-layout.handler';
import { ListAnalysesHandler } from './application/queries/list-analyses.handler';
import { GetLayoutHandler } from './application/queries/get-layout.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([LayoutGrid, LayoutContainer, ConstraintSet], 'd2_connection')],
  controllers: [LayoutGraphEngineController],
  providers: [LayoutGraphEngineService, ExtractGridHandler, AnalyzeLayoutHandler, ListAnalysesHandler, GetLayoutHandler],
  exports: [LayoutGraphEngineService],
})
export class LayoutGraphEngineModule {}
