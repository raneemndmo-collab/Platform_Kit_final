import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FidelityReport, PixelDiff, RegressionBaseline, DriftAlert } from './domain/entities';
import { VisualDriftDetectionEngineService } from './application/services/visual-drift.service';
import { VisualDriftDetectionEngineController } from './api/controllers/visual-drift.controller';
import { DetectDriftHandler } from './application/commands/detect-drift.handler';
import { CompareVersionsHandler } from './application/commands/compare-versions.handler';
import { ListReportsHandler } from './application/queries/list-reports.handler';
import { GetReportHandler } from './application/queries/get-report.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([FidelityReport, PixelDiff, RegressionBaseline, DriftAlert], 'd13_connection')],
  controllers: [VisualDriftDetectionEngineController],
  providers: [VisualDriftDetectionEngineService, DetectDriftHandler, CompareVersionsHandler, ListReportsHandler, GetReportHandler],
  exports: [VisualDriftDetectionEngineService],
})
export class VisualDriftDetectionEngineModule {}
