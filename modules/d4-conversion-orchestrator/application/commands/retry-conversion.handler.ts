import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RetryConversionCommand } from './retry-conversion.command';
import { ConversionJob } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RetryConversionCommand)
export class RetryConversionHandler implements ICommandHandler<RetryConversionCommand> {
  private readonly logger = new Logger(RetryConversionHandler.name);

  constructor(
    @InjectRepository(ConversionJob, 'd4_connection')
    private readonly repo: Repository<ConversionJob>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RetryConversionCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RetryConversionHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('conversion.retry', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RetryConversionHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RetryConversionHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
