import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RecordInteractionCommand } from './record-interaction.command';
import { UserProfile } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RecordInteractionCommand)
export class RecordInteractionHandler implements ICommandHandler<RecordInteractionCommand> {
  private readonly logger = new Logger(RecordInteractionHandler.name);

  constructor(
    @InjectRepository(UserProfile, 'm22_connection')
    private readonly repo: Repository<UserProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RecordInteractionCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RecordInteractionHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('interaction.record', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RecordInteractionHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RecordInteractionHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
