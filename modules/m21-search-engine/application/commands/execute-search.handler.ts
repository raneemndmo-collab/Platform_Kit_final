import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecuteSearchCommand } from './execute-search.command';
import { SearchIndex } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ExecuteSearchCommand)
export class ExecuteSearchHandler implements ICommandHandler<ExecuteSearchCommand> {
  private readonly logger = new Logger(ExecuteSearchHandler.name);

  constructor(
    @InjectRepository(SearchIndex, 'm21_connection')
    private readonly repo: Repository<SearchIndex>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ExecuteSearchCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ExecuteSearchHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('search.execute', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ExecuteSearchHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ExecuteSearchHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
