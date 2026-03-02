import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NLPTask, NLPModel, NLPTrainingData } from './domain/entities';
import { NLPService } from './application/services/nlp.service';
import { NLPController } from './api/controllers/nlp.controller';
import { ExtractEntitiesHandler } from './application/commands/extract-entities.handler';
import { AnalyzeTextHandler } from './application/commands/analyze-text.handler';
import { ListAnalysesHandler } from './application/queries/list-analyses.handler';
import { GetAnalysisHandler } from './application/queries/get-analysis.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([NLPTask, NLPModel, NLPTrainingData], 'm16_connection')],
  controllers: [NLPController],
  providers: [NLPService, ExtractEntitiesHandler, AnalyzeTextHandler, ListAnalysesHandler, GetAnalysisHandler],
  exports: [NLPService],
})
export class NLPModule {}
