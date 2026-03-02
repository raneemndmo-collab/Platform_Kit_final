import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecuteJobCommand } from './execute-job.command';
import { ScheduledJob } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ExecuteJobCommand)
export class ExecuteJobHandler implements ICommandHandler<ExecuteJobCommand> {
  private readonly logger = new Logger(ExecuteJobHandler.name);

  constructor(
    @InjectRepository(ScheduledJob, 'm26_connection')
    private readonly repo: Repository<ScheduledJob>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ExecuteJobCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ExecuteJobHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('job.execute', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ExecuteJobHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ExecuteJobHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
