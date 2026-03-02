import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RunCheckCommand } from './run-check.command';
import { ComplianceFramework } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(RunCheckCommand)
export class RunCheckHandler implements ICommandHandler<RunCheckCommand> {
  private readonly logger = new Logger(RunCheckHandler.name);

  constructor(
    @InjectRepository(ComplianceFramework, 'm9_connection')
    private readonly repo: Repository<ComplianceFramework>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RunCheckCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ RunCheckHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('check.run', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح RunCheckHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل RunCheckHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
