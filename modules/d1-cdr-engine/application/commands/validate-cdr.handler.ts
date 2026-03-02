import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ValidateCdrCommand } from './validate-cdr.command';
import { CDRDocument } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ValidateCdrCommand)
export class ValidateCdrHandler implements ICommandHandler<ValidateCdrCommand> {
  private readonly logger = new Logger(ValidateCdrHandler.name);

  constructor(
    @InjectRepository(CDRDocument, 'd1_connection')
    private readonly repo: Repository<CDRDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ValidateCdrCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ValidateCdrHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('cdr.validate', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ValidateCdrHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ValidateCdrHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
