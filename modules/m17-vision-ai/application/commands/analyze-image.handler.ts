import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyzeImageCommand } from './analyze-image.command';
import { VisionTask } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(AnalyzeImageCommand)
export class AnalyzeImageHandler implements ICommandHandler<AnalyzeImageCommand> {
  private readonly logger = new Logger(AnalyzeImageHandler.name);

  constructor(
    @InjectRepository(VisionTask, 'm17_connection')
    private readonly repo: Repository<VisionTask>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: AnalyzeImageCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ AnalyzeImageHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('image.analyze', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح AnalyzeImageHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل AnalyzeImageHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
