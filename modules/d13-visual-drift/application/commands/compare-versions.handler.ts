import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompareVersionsCommand } from './compare-versions.command';
import { FidelityReport } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CompareVersionsCommand)
export class CompareVersionsHandler implements ICommandHandler<CompareVersionsCommand> {
  private readonly logger = new Logger(CompareVersionsHandler.name);

  constructor(
    @InjectRepository(FidelityReport, 'd13_connection')
    private readonly repo: Repository<FidelityReport>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CompareVersionsCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CompareVersionsHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('versions.compare', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CompareVersionsHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CompareVersionsHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
