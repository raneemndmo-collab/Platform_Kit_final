import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RenderDocumentCommand } from './render-document.command';
import { RenderJob } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RenderDocumentCommand)
export class RenderDocumentHandler implements ICommandHandler<RenderDocumentCommand> {
  private readonly logger = new Logger(RenderDocumentHandler.name);

  constructor(
    @InjectRepository(RenderJob, 'd5_connection')
    private readonly repo: Repository<RenderJob>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RenderDocumentCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RenderDocumentHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('document.render', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RenderDocumentHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RenderDocumentHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
