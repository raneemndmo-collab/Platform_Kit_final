import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterAppCommand } from './register-app.command';
import { ApiKey } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RegisterAppCommand)
export class RegisterAppHandler implements ICommandHandler<RegisterAppCommand> {
  private readonly logger = new Logger(RegisterAppHandler.name);

  constructor(
    @InjectRepository(ApiKey, 'm31_connection')
    private readonly repo: Repository<ApiKey>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RegisterAppCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RegisterAppHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('app.register', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RegisterAppHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RegisterAppHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
