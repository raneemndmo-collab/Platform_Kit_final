import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataIntelligenceService } from './application/services/data-intelligence.service';
import { DataIntelligenceController } from './api/controllers/data-intelligence.controller';
import { DataModel, MetricDerivation, Prediction, QueryPlan } from './domain/entities';
@Module({
  imports: [TypeOrmModule.forFeature([DataModel, MetricDerivation, Prediction, QueryPlan], 'dataintel_connection')],
  controllers: [DataIntelligenceController],
  providers: [DataIntelligenceService],
  exports: [DataIntelligenceService],
})
export class DataIntelligenceModule {}
