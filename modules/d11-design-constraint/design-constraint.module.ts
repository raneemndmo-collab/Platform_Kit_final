import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConstraintRule, DensityMap, EmphasisMap } from './domain/entities';
import { DesignConstraintEngineService } from './application/services/design-constraint.service';
import { DesignConstraintEngineController } from './api/controllers/design-constraint.controller';
import { ValidateDesignHandler } from './application/commands/validate-design.handler';
import { CreateConstraintHandler } from './application/commands/create-constraint.handler';
import { GetConstraintHandler } from './application/queries/get-constraint.handler';
import { ListConstraintsHandler } from './application/queries/list-constraints.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ConstraintRule, DensityMap, EmphasisMap], 'd11_connection')],
  controllers: [DesignConstraintEngineController],
  providers: [DesignConstraintEngineService, ValidateDesignHandler, CreateConstraintHandler, GetConstraintHandler, ListConstraintsHandler],
  exports: [DesignConstraintEngineService],
})
export class DesignConstraintEngineModule {}
