import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateWidgetCommand } from './update-widget.command';
import { Dashboard } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(UpdateWidgetCommand)
export class UpdateWidgetHandler implements ICommandHandler<UpdateWidgetCommand> {
  private readonly logger = new Logger(UpdateWidgetHandler.name);

  constructor(
    @InjectRepository(Dashboard, 'm18_connection')
    private readonly repo: Repository<Dashboard>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateWidgetCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ UpdateWidgetHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('widget.updated', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح UpdateWidgetHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل UpdateWidgetHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
