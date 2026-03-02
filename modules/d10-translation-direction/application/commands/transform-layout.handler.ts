import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransformLayoutCommand } from './transform-layout.command';
import { TranslationJob } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(TransformLayoutCommand)
export class TransformLayoutHandler implements ICommandHandler<TransformLayoutCommand> {
  private readonly logger = new Logger(TransformLayoutHandler.name);

  constructor(
    @InjectRepository(TranslationJob, 'd10_connection')
    private readonly repo: Repository<TranslationJob>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: TransformLayoutCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ TransformLayoutHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('layout.transform', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح TransformLayoutHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل TransformLayoutHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
