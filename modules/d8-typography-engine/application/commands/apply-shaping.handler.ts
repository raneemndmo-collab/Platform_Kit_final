import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplyShapingCommand } from './apply-shaping.command';
import { FontFamily } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ApplyShapingCommand)
export class ApplyShapingHandler implements ICommandHandler<ApplyShapingCommand> {
  private readonly logger = new Logger(ApplyShapingHandler.name);

  constructor(
    @InjectRepository(FontFamily, 'd8_connection')
    private readonly repo: Repository<FontFamily>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ApplyShapingCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ApplyShapingHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('shaping.apply', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ApplyShapingHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ApplyShapingHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
