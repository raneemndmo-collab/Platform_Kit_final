import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataIntelligenceEntity } from './domain/entities/data_intelligence.entity';
import { DataIntelligenceRepository } from './infrastructure/repositories/data_intelligence.repository';
import { DataIntelligenceService } from './application/services/data_intelligence.service';

@Module({
  imports: [TypeOrmModule.forFeature([DataIntelligenceEntity], 'data_intelligence_connection')],
  providers: [DataIntelligenceService, DataIntelligenceRepository],
  exports: [DataIntelligenceService],
})
export class DataIntelligenceModule {}
