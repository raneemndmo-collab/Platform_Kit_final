import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModel, AIInferenceRequest, AIContainmentRule, AIFallbackChain, AICapabilityInterface } from './domain/entities';
import { AIOrchestrationService } from './application/services/ai-orchestration.service';
import { AIOrchestrationController } from './api/controllers/ai-orchestration.controller';
import { RegisterModelHandler } from './application/commands/register-model.handler';
import { InvokeInferenceHandler } from './application/commands/invoke-inference.handler';
import { GetModelHandler } from './application/queries/get-model.handler';
import { ListModelsHandler } from './application/queries/list-models.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([AIModel, AIInferenceRequest, AIContainmentRule, AIFallbackChain, AICapabilityInterface], 'm11_connection')],
  controllers: [AIOrchestrationController],
  providers: [AIOrchestrationService, RegisterModelHandler, InvokeInferenceHandler, GetModelHandler, ListModelsHandler],
  exports: [AIOrchestrationService],
})
export class AIOrchestrationModule {}
