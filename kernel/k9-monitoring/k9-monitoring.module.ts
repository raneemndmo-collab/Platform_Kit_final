// =============================================================================
// K9: Monitoring Module
// Database: monitoring_db (exclusive) | Performance: 15s health interval
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  HealthRecordEntity, MetricSnapshotEntity,
  AlertRuleEntity, AlertIncidentEntity,
} from './domain/entities';
import { K9MonitoringService } from './application/handlers/monitoring.service';
import { MonitoringController } from './api/controllers/monitoring.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HealthRecordEntity,
      MetricSnapshotEntity,
      AlertRuleEntity,
      AlertIncidentEntity,
    ], 'k9_connection'),
  ],
  controllers: [MonitoringController],
  providers: [K9MonitoringService],
  exports: [K9MonitoringService],
})
export class K9MonitoringModule {}
