// =============================================================================
// K10: Module Lifecycle Module
// Database: lifecycle_db (exclusive) | DAG Validation: DGV-002
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ModuleRegistryEntity, DependencyEdgeEntity, ModuleVersionEntity,
} from './domain/entities';
import { K10LifecycleService } from './application/handlers/lifecycle.service';
import { LifecycleController } from './api/controllers/lifecycle.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModuleRegistryEntity,
      DependencyEdgeEntity,
      ModuleVersionEntity,
    ], 'k10_connection'),
  ],
  controllers: [LifecycleController],
  providers: [K10LifecycleService],
  exports: [K10LifecycleService],
})
export class K10LifecycleModule {}
