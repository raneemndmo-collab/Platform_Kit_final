import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterModelCommand } from './register-model.command';
import { AIModel } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RegisterModelCommand)
export class RegisterModelHandler implements ICommandHandler<RegisterModelCommand> {
  private readonly logger = new Logger(RegisterModelHandler.name);

  constructor(
    @InjectRepository(AIModel, 'm11_connection')
    private readonly repo: Repository<AIModel>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RegisterModelCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RegisterModelHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('model.register', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RegisterModelHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RegisterModelHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
