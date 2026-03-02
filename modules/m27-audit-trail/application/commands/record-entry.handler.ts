import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RecordEntryCommand } from './record-entry.command';
import { AuditEntry } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RecordEntryCommand)
export class RecordEntryHandler implements ICommandHandler<RecordEntryCommand> {
  private readonly logger = new Logger(RecordEntryHandler.name);

  constructor(
    @InjectRepository(AuditEntry, 'm27_connection')
    private readonly repo: Repository<AuditEntry>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RecordEntryCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RecordEntryHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('entry.record', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RecordEntryHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RecordEntryHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
