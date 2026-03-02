import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvokeInferenceCommand } from './invoke-inference.command';
import { AIModel } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(InvokeInferenceCommand)
export class InvokeInferenceHandler implements ICommandHandler<InvokeInferenceCommand> {
  private readonly logger = new Logger(InvokeInferenceHandler.name);

  constructor(
    @InjectRepository(AIModel, 'm11_connection')
    private readonly repo: Repository<AIModel>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: InvokeInferenceCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ InvokeInferenceHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('inference.invoke', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح InvokeInferenceHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل InvokeInferenceHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
