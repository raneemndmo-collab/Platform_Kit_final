import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OptimizeImageCommand } from './optimize-image.command';
import { MediaAsset } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(OptimizeImageCommand)
export class OptimizeImageHandler implements ICommandHandler<OptimizeImageCommand> {
  private readonly logger = new Logger(OptimizeImageHandler.name);

  constructor(
    @InjectRepository(MediaAsset, 'd6_connection')
    private readonly repo: Repository<MediaAsset>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: OptimizeImageCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ OptimizeImageHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('image.optimize', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح OptimizeImageHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل OptimizeImageHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
