import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ParseDocumentCommand } from './parse-document.command';
import { CDRDocument } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ParseDocumentCommand)
export class ParseDocumentHandler implements ICommandHandler<ParseDocumentCommand> {
  private readonly logger = new Logger(ParseDocumentHandler.name);

  constructor(
    @InjectRepository(CDRDocument, 'd1_connection')
    private readonly repo: Repository<CDRDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ParseDocumentCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ParseDocumentHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('document.parse', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ParseDocumentHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ParseDocumentHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
