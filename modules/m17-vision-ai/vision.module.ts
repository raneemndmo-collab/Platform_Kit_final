import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisionTask, VisionModel, VisionAnnotation } from './domain/entities';
import { VisionService } from './application/services/vision.service';
import { VisionController } from './api/controllers/vision.controller';
import { DetectObjectsHandler } from './application/commands/detect-objects.handler';
import { AnalyzeImageHandler } from './application/commands/analyze-image.handler';
import { ListAnalysesHandler } from './application/queries/list-analyses.handler';
import { GetAnalysisHandler } from './application/queries/get-analysis.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([VisionTask, VisionModel, VisionAnnotation], 'm17_connection')],
  controllers: [VisionController], providers: [VisionService, DetectObjectsHandler, AnalyzeImageHandler, ListAnalysesHandler, GetAnalysisHandler], exports: [VisionService],
})
export class VisionModule {}
