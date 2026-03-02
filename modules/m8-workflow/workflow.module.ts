import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition, WorkflowInstance, WorkflowStepExecution, WorkflowAuditTrail } from './domain/entities';
import { WorkflowService } from './application/services/workflow.service';
import { WorkflowController } from './api/controllers/workflow.controller';
import { StartWorkflowHandler } from './application/commands/start-workflow.handler';
import { CompleteStepHandler } from './application/commands/complete-step.handler';
import { ListInstancesHandler } from './application/queries/list-instances.handler';
import { GetInstanceHandler } from './application/queries/get-instance.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([WorkflowDefinition, WorkflowInstance, WorkflowStepExecution, WorkflowAuditTrail], 'm8_connection')],
  controllers: [WorkflowController],
  providers: [WorkflowService, StartWorkflowHandler, CompleteStepHandler, ListInstancesHandler, GetInstanceHandler],
  exports: [WorkflowService],
})
export class WorkflowModule {}
