import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MapInteractionsCommand } from './map-interactions.command';
import { InteractionLayer } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(MapInteractionsCommand)
export class MapInteractionsHandler implements ICommandHandler<MapInteractionsCommand> {
  private readonly logger = new Logger(MapInteractionsHandler.name);

  constructor(
    @InjectRepository(InteractionLayer, 'd7_connection')
    private readonly repo: Repository<InteractionLayer>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: MapInteractionsCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ MapInteractionsHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('interactions.map', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح MapInteractionsHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل MapInteractionsHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
