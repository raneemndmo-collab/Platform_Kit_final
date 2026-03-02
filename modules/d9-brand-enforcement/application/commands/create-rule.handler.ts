import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRuleCommand } from './create-rule.command';
import { BrandPack } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateRuleCommand)
export class CreateRuleHandler implements ICommandHandler<CreateRuleCommand> {
  private readonly logger = new Logger(CreateRuleHandler.name);

  constructor(
    @InjectRepository(BrandPack, 'd9_connection')
    private readonly repo: Repository<BrandPack>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateRuleCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreateRuleHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('rule.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreateRuleHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreateRuleHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
