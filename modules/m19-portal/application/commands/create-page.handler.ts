import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatePageCommand } from './create-page.command';
import { PortalPage } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreatePageCommand)
export class CreatePageHandler implements ICommandHandler<CreatePageCommand> {
  private readonly logger = new Logger(CreatePageHandler.name);

  constructor(
    @InjectRepository(PortalPage, 'm19_connection')
    private readonly repo: Repository<PortalPage>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreatePageCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreatePageHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('page.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreatePageHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreatePageHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
