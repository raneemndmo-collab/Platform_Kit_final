import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExtractGridCommand } from './extract-grid.command';
import { LayoutGrid } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ExtractGridCommand)
export class ExtractGridHandler implements ICommandHandler<ExtractGridCommand> {
  private readonly logger = new Logger(ExtractGridHandler.name);

  constructor(
    @InjectRepository(LayoutGrid, 'd2_connection')
    private readonly repo: Repository<LayoutGrid>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ExtractGridCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ExtractGridHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('grid.extract', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ExtractGridHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ExtractGridHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
