import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApilOrchestratorEntity } from './domain/entities/apil_orchestrator.entity';
import { ApilOrchestratorRepository } from './infrastructure/repositories/apil_orchestrator.repository';
import { ApilOrchestratorService } from './application/services/apil_orchestrator.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApilOrchestratorEntity], 'apil_orchestrator_connection')],
  providers: [ApilOrchestratorService, ApilOrchestratorRepository],
  exports: [ApilOrchestratorService],
})
export class ApilOrchestratorModule {}
