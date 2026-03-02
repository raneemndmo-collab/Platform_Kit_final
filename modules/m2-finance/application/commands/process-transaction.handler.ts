import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProcessTransactionCommand } from './process-transaction.command';
import { AccountEntity } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ProcessTransactionCommand)
export class ProcessTransactionHandler implements ICommandHandler<ProcessTransactionCommand> {
  private readonly logger = new Logger(ProcessTransactionHandler.name);

  constructor(
    @InjectRepository(AccountEntity, 'm2_connection')
    private readonly repo: Repository<AccountEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ProcessTransactionCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ProcessTransactionHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('transaction.process', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ProcessTransactionHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ProcessTransactionHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
