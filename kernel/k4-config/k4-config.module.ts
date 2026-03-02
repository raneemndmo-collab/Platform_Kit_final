// =============================================================================
// K4: Configuration — NestJS Module
// Build Order: #1 (needed by all other kernels)
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationEntity, FeatureFlagEntity, EnvironmentProfileEntity } from './domain/entities';
import { K4ConfigService } from './application/handlers/config.service';
import { K4ConfigController } from './api/controllers/config.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfigurationEntity,
      FeatureFlagEntity,
      EnvironmentProfileEntity,
    ], 'k4_connection'),
  ],
  controllers: [K4ConfigController],
  providers: [K4ConfigService],
  exports: [K4ConfigService],
})
export class K4ConfigModule {}
