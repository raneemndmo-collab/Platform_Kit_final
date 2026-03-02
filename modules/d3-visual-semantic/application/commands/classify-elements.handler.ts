import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassifyElementsCommand } from './classify-elements.command';
import { SemanticNode } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ClassifyElementsCommand)
export class ClassifyElementsHandler implements ICommandHandler<ClassifyElementsCommand> {
  private readonly logger = new Logger(ClassifyElementsHandler.name);

  constructor(
    @InjectRepository(SemanticNode, 'd3_connection')
    private readonly repo: Repository<SemanticNode>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ClassifyElementsCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ClassifyElementsHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('elements.classify', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ClassifyElementsHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ClassifyElementsHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
