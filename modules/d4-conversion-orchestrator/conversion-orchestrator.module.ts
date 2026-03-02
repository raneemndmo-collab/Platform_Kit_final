import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversionJob, Pipeline, FidelityCheckpoint } from './domain/entities';
import { ConversionOrchestratorService } from './application/services/conversion-orchestrator.service';
import { ConversionOrchestratorController } from './api/controllers/conversion-orchestrator.controller';
import { StartConversionHandler } from './application/commands/start-conversion.handler';
import { RetryConversionHandler } from './application/commands/retry-conversion.handler';
import { GetJobHandler } from './application/queries/get-job.handler';
import { ListJobsHandler } from './application/queries/list-jobs.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ConversionJob, Pipeline, FidelityCheckpoint], 'd4_connection')],
  controllers: [ConversionOrchestratorController],
  providers: [ConversionOrchestratorService, StartConversionHandler, RetryConversionHandler, GetJobHandler, ListJobsHandler],
  exports: [ConversionOrchestratorService],
})
export class ConversionOrchestratorModule {}
