import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceIntelligenceEntity } from './domain/entities/performance_intelligence.entity';
import { PerformanceIntelligenceRepository } from './infrastructure/repositories/performance_intelligence.repository';
import { PerformanceIntelligenceService } from './application/services/performance_intelligence.service';

@Module({
  imports: [TypeOrmModule.forFeature([PerformanceIntelligenceEntity], 'performance_intelligence_connection')],
  providers: [PerformanceIntelligenceService, PerformanceIntelligenceRepository],
  exports: [PerformanceIntelligenceService],
})
export class PerformanceIntelligenceModule {}
