import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionRule, DecisionExecution, DecisionModel } from './domain/entities';
import { DecisionService } from './application/services/decision.service';
import { DecisionController } from './api/controllers/decision.controller';
import { EvaluateRuleHandler } from './application/commands/evaluate-rule.handler';
import { CreateRuleHandler } from './application/commands/create-rule.handler';
import { GetRuleHandler } from './application/queries/get-rule.handler';
import { ListRulesHandler } from './application/queries/list-rules.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([DecisionRule, DecisionExecution, DecisionModel], 'm14_connection')],
  controllers: [DecisionController], providers: [DecisionService, EvaluateRuleHandler, CreateRuleHandler, GetRuleHandler, ListRulesHandler], exports: [DecisionService],
})
export class DecisionModule {}
