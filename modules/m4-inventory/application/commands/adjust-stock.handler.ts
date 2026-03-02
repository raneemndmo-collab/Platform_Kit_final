import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdjustStockCommand } from './adjust-stock.command';
import { ItemEntity } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(AdjustStockCommand)
export class AdjustStockHandler implements ICommandHandler<AdjustStockCommand> {
  private readonly logger = new Logger(AdjustStockHandler.name);

  constructor(
    @InjectRepository(ItemEntity, 'm4_connection')
    private readonly repo: Repository<ItemEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: AdjustStockCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ AdjustStockHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('stock.adjust', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح AdjustStockHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل AdjustStockHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
