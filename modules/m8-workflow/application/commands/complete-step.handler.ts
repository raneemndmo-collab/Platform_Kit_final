import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompleteStepCommand } from './complete-step.command';
import { WorkflowDefinition } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CompleteStepCommand)
export class CompleteStepHandler implements ICommandHandler<CompleteStepCommand> {
  private readonly logger = new Logger(CompleteStepHandler.name);

  constructor(
    @InjectRepository(WorkflowDefinition, 'm8_connection')
    private readonly repo: Repository<WorkflowDefinition>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CompleteStepCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CompleteStepHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('step.complete', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CompleteStepHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CompleteStepHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
