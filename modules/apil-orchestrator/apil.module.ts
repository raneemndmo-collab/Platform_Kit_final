import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APilOrchestratorService } from './application/services/apil-orchestrator.service';
import { APilController } from './api/controllers/apil.controller';
import { AiExecutionPlan, AgentTask, AgentResult } from './domain/entities';
@Module({
  imports: [TypeOrmModule.forFeature([AiExecutionPlan, AgentTask, AgentResult], 'apil_connection')],
  controllers: [APilController],
  providers: [APilOrchestratorService],
  exports: [APilOrchestratorService],
})
export class APilOrchestratorModule {}
