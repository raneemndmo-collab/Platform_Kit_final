import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent, AnalyticsDashboard, AnalyticsMetric, DataLakeEntry } from './domain/entities';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsController } from './api/controllers/analytics.controller';
import { CreatePipelineHandler } from './application/commands/create-pipeline.handler';
import { RunPipelineHandler } from './application/commands/run-pipeline.handler';
import { ListDatasetsHandler } from './application/queries/list-datasets.handler';
import { GetPipelineHandler } from './application/queries/get-pipeline.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([AnalyticsEvent, AnalyticsDashboard, AnalyticsMetric, DataLakeEntry], 'm12_connection')],
  controllers: [AnalyticsController], providers: [AnalyticsService, CreatePipelineHandler, RunPipelineHandler, ListDatasetsHandler, GetPipelineHandler], exports: [AnalyticsService],
})
export class AnalyticsModule {}
