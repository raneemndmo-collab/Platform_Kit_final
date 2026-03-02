import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyzeTextCommand } from './analyze-text.command';
import { NLPTask } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(AnalyzeTextCommand)
export class AnalyzeTextHandler implements ICommandHandler<AnalyzeTextCommand> {
  private readonly logger = new Logger(AnalyzeTextHandler.name);

  constructor(
    @InjectRepository(NLPTask, 'm16_connection')
    private readonly repo: Repository<NLPTask>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: AnalyzeTextCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ AnalyzeTextHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('text.analyze', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح AnalyzeTextHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل AnalyzeTextHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
