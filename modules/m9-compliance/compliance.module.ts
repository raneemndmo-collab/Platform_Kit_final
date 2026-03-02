import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceFramework, ComplianceControl, ComplianceAssessment, ComplianceRisk, ComplianceViolation } from './domain/entities';
import { ComplianceService } from './application/services/compliance.service';
import { ComplianceController } from './api/controllers/compliance.controller';
import { RunCheckHandler } from './application/commands/run-check.handler';
import { ResolveViolationHandler } from './application/commands/resolve-violation.handler';
import { GetCheckHandler } from './application/queries/get-check.handler';
import { ListViolationsHandler } from './application/queries/list-violations.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([ComplianceFramework, ComplianceControl, ComplianceAssessment, ComplianceRisk, ComplianceViolation], 'm9_connection')],
  controllers: [ComplianceController],
  providers: [ComplianceService, RunCheckHandler, ResolveViolationHandler, GetCheckHandler, ListViolationsHandler],
  exports: [ComplianceService],
})
export class ComplianceModule {}
