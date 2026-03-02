import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrainClassifierCommand } from './train-classifier.command';
import { SemanticNode } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(TrainClassifierCommand)
export class TrainClassifierHandler implements ICommandHandler<TrainClassifierCommand> {
  private readonly logger = new Logger(TrainClassifierHandler.name);

  constructor(
    @InjectRepository(SemanticNode, 'd3_connection')
    private readonly repo: Repository<SemanticNode>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: TrainClassifierCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ TrainClassifierHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('classifier.train', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح TrainClassifierHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل TrainClassifierHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
