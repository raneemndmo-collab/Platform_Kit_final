import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublishVersionCommand } from './publish-version.command';
import { Document } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(PublishVersionCommand)
export class PublishVersionHandler implements ICommandHandler<PublishVersionCommand> {
  private readonly logger = new Logger(PublishVersionHandler.name);

  constructor(
    @InjectRepository(Document, 'm7_connection')
    private readonly repo: Repository<Document>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: PublishVersionCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ PublishVersionHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('version.publish', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح PublishVersionHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل PublishVersionHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
