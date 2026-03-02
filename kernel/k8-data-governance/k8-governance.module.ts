// =============================================================================
// K8: Data Governance Module
// Database: governance_db (exclusive) | Event Namespace: governance.*
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DataClassificationEntity, RetentionPolicyEntity, SchemaValidationEntity,
} from './domain/entities';
import { K8GovernanceService } from './application/handlers/governance.service';
import { GovernanceController } from './api/controllers/governance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataClassificationEntity,
      RetentionPolicyEntity,
      SchemaValidationEntity,
    ], 'k8_connection'),
  ],
  controllers: [GovernanceController],
  providers: [K8GovernanceService],
  exports: [K8GovernanceService],
})
export class K8GovernanceModule {}
