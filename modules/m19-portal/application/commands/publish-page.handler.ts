import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublishPageCommand } from './publish-page.command';
import { PortalPage } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(PublishPageCommand)
export class PublishPageHandler implements ICommandHandler<PublishPageCommand> {
  private readonly logger = new Logger(PublishPageHandler.name);

  constructor(
    @InjectRepository(PortalPage, 'm19_connection')
    private readonly repo: Repository<PortalPage>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: PublishPageCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ PublishPageHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('page.publish', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح PublishPageHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل PublishPageHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
