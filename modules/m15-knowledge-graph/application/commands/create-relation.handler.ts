import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateRelationCommand } from './create-relation.command';
import { KGNode } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateRelationCommand)
export class CreateRelationHandler implements ICommandHandler<CreateRelationCommand> {
  private readonly logger = new Logger(CreateRelationHandler.name);

  constructor(
    @InjectRepository(KGNode, 'm15_connection')
    private readonly repo: Repository<KGNode>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateRelationCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreateRelationHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('relation.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreateRelationHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreateRelationHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
