import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdatePhaseCommand } from './update-phase.command';
import { Project } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(UpdatePhaseCommand)
export class UpdatePhaseHandler implements ICommandHandler<UpdatePhaseCommand> {
  private readonly logger = new Logger(UpdatePhaseHandler.name);

  constructor(
    @InjectRepository(Project, 'm6_connection')
    private readonly repo: Repository<Project>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdatePhaseCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ UpdatePhaseHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('phase.updated', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح UpdatePhaseHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل UpdatePhaseHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
