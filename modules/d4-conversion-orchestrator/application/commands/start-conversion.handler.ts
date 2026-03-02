import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StartConversionCommand } from './start-conversion.command';
import { ConversionJob } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(StartConversionCommand)
export class StartConversionHandler implements ICommandHandler<StartConversionCommand> {
  private readonly logger = new Logger(StartConversionHandler.name);

  constructor(
    @InjectRepository(ConversionJob, 'd4_connection')
    private readonly repo: Repository<ConversionJob>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: StartConversionCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ StartConversionHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('conversion.start', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح StartConversionHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل StartConversionHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
