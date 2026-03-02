import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResolveFontsCommand } from './resolve-fonts.command';
import { FontFamily } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ResolveFontsCommand)
export class ResolveFontsHandler implements ICommandHandler<ResolveFontsCommand> {
  private readonly logger = new Logger(ResolveFontsHandler.name);

  constructor(
    @InjectRepository(FontFamily, 'd8_connection')
    private readonly repo: Repository<FontFamily>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ResolveFontsCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ResolveFontsHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('fonts.resolve', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ResolveFontsHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ResolveFontsHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
