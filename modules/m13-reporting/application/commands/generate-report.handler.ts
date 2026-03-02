import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GenerateReportCommand } from './generate-report.command';
import { ReportDefinition } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(GenerateReportCommand)
export class GenerateReportHandler implements ICommandHandler<GenerateReportCommand> {
  private readonly logger = new Logger(GenerateReportHandler.name);

  constructor(
    @InjectRepository(ReportDefinition, 'm13_connection')
    private readonly repo: Repository<ReportDefinition>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: GenerateReportCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ GenerateReportHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('report.generate', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح GenerateReportHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل GenerateReportHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
