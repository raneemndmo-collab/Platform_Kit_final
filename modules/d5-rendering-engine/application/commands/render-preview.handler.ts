import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RenderPreviewCommand } from './render-preview.command';
import { RenderJob } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RenderPreviewCommand)
export class RenderPreviewHandler implements ICommandHandler<RenderPreviewCommand> {
  private readonly logger = new Logger(RenderPreviewHandler.name);

  constructor(
    @InjectRepository(RenderJob, 'd5_connection')
    private readonly repo: Repository<RenderJob>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RenderPreviewCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RenderPreviewHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('preview.render', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RenderPreviewHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RenderPreviewHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
