import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ValidateBindingCommand } from './validate-binding.command';
import { BindingTemplate } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ValidateBindingCommand)
export class ValidateBindingHandler implements ICommandHandler<ValidateBindingCommand> {
  private readonly logger = new Logger(ValidateBindingHandler.name);

  constructor(
    @InjectRepository(BindingTemplate, 'd12_connection')
    private readonly repo: Repository<BindingTemplate>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ValidateBindingCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ValidateBindingHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('binding.validate', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ValidateBindingHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ValidateBindingHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
