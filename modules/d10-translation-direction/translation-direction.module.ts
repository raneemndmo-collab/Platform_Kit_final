import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationJob, DirectionProfile, CulturalRule } from './domain/entities';
import { TranslationDirectionEngineService } from './application/services/translation-direction.service';
import { TranslationDirectionEngineController } from './api/controllers/translation-direction.controller';
import { TranslateDirectionHandler } from './application/commands/translate-direction.handler';
import { TransformLayoutHandler } from './application/commands/transform-layout.handler';
import { GetJobHandler } from './application/queries/get-job.handler';
import { ListJobsHandler } from './application/queries/list-jobs.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([TranslationJob, DirectionProfile, CulturalRule], 'd10_connection')],
  controllers: [TranslationDirectionEngineController],
  providers: [TranslationDirectionEngineService, TranslateDirectionHandler, TransformLayoutHandler, GetJobHandler, ListJobsHandler],
  exports: [TranslationDirectionEngineService],
})
export class TranslationDirectionEngineModule {}
