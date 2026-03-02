import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EvaluateRuleCommand } from './evaluate-rule.command';
import { DecisionRule } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(EvaluateRuleCommand)
export class EvaluateRuleHandler implements ICommandHandler<EvaluateRuleCommand> {
  private readonly logger = new Logger(EvaluateRuleHandler.name);

  constructor(
    @InjectRepository(DecisionRule, 'm14_connection')
    private readonly repo: Repository<DecisionRule>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: EvaluateRuleCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ EvaluateRuleHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('rule.evaluate', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح EvaluateRuleHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل EvaluateRuleHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
