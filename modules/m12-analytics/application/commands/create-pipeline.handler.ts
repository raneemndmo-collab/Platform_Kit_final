import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatePipelineCommand } from './create-pipeline.command';
import { AnalyticsEvent } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreatePipelineCommand)
export class CreatePipelineHandler implements ICommandHandler<CreatePipelineCommand> {
  private readonly logger = new Logger(CreatePipelineHandler.name);

  constructor(
    @InjectRepository(AnalyticsEvent, 'm12_connection')
    private readonly repo: Repository<AnalyticsEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreatePipelineCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreatePipelineHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('pipeline.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreatePipelineHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreatePipelineHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
