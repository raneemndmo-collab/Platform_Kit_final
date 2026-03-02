import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyzeLayoutCommand } from './analyze-layout.command';
import { LayoutGrid } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(AnalyzeLayoutCommand)
export class AnalyzeLayoutHandler implements ICommandHandler<AnalyzeLayoutCommand> {
  private readonly logger = new Logger(AnalyzeLayoutHandler.name);

  constructor(
    @InjectRepository(LayoutGrid, 'd2_connection')
    private readonly repo: Repository<LayoutGrid>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: AnalyzeLayoutCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ AnalyzeLayoutHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('layout.analyze', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح AnalyzeLayoutHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل AnalyzeLayoutHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
