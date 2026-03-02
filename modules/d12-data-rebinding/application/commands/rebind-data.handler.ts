import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RebindDataCommand } from './rebind-data.command';
import { BindingTemplate } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RebindDataCommand)
export class RebindDataHandler implements ICommandHandler<RebindDataCommand> {
  private readonly logger = new Logger(RebindDataHandler.name);

  constructor(
    @InjectRepository(BindingTemplate, 'd12_connection')
    private readonly repo: Repository<BindingTemplate>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RebindDataCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RebindDataHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('data.rebind', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RebindDataHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RebindDataHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
