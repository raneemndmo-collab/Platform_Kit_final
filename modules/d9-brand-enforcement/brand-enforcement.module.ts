import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandPack, ComplianceReport } from './domain/entities';
import { BrandEnforcementEngineService } from './application/services/brand-enforcement.service';
import { BrandEnforcementEngineController } from './api/controllers/brand-enforcement.controller';
import { CheckComplianceHandler } from './application/commands/check-compliance.handler';
import { CreateRuleHandler } from './application/commands/create-rule.handler';
import { GetRuleHandler } from './application/queries/get-rule.handler';
import { ListRulesHandler } from './application/queries/list-rules.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([BrandPack, ComplianceReport], 'd9_connection')],
  controllers: [BrandEnforcementEngineController],
  providers: [BrandEnforcementEngineService, CheckComplianceHandler, CreateRuleHandler, GetRuleHandler, ListRulesHandler],
  exports: [BrandEnforcementEngineService],
})
export class BrandEnforcementEngineModule {}
