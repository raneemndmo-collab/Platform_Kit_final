// =============================================================================
// K7: Task Orchestration Module
// Database: orchestration_db (exclusive) | Event Namespace: orchestration.*
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SagaInstanceEntity, SagaStepDefinitionEntity,
  ScheduledJobEntity, TaskExecutionEntity,
} from './domain/entities';
import { K7OrchestrationService } from './application/handlers/orchestration.service';
import { OrchestrationController } from './api/controllers/orchestration.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SagaInstanceEntity,
      SagaStepDefinitionEntity,
      ScheduledJobEntity,
      TaskExecutionEntity,
    ], 'k7_connection'),
  ],
  controllers: [OrchestrationController],
  providers: [K7OrchestrationService],
  exports: [K7OrchestrationService],
})
export class K7OrchestrationModule {}
