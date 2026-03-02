import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StartWorkflowCommand } from './start-workflow.command';
import { WorkflowDefinition } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(StartWorkflowCommand)
export class StartWorkflowHandler implements ICommandHandler<StartWorkflowCommand> {
  private readonly logger = new Logger(StartWorkflowHandler.name);

  constructor(
    @InjectRepository(WorkflowDefinition, 'm8_connection')
    private readonly repo: Repository<WorkflowDefinition>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: StartWorkflowCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ StartWorkflowHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('workflow.start', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح StartWorkflowHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل StartWorkflowHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
