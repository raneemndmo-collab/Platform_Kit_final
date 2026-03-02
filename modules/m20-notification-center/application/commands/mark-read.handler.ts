import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarkReadCommand } from './mark-read.command';
import { Notification } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(MarkReadCommand)
export class MarkReadHandler implements ICommandHandler<MarkReadCommand> {
  private readonly logger = new Logger(MarkReadHandler.name);

  constructor(
    @InjectRepository(Notification, 'm20_connection')
    private readonly repo: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: MarkReadCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ MarkReadHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('read.mark', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح MarkReadHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل MarkReadHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
