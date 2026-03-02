import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateConstraintCommand } from './create-constraint.command';
import { ConstraintRule } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateConstraintCommand)
export class CreateConstraintHandler implements ICommandHandler<CreateConstraintCommand> {
  private readonly logger = new Logger(CreateConstraintHandler.name);

  constructor(
    @InjectRepository(ConstraintRule, 'd11_connection')
    private readonly repo: Repository<ConstraintRule>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateConstraintCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreateConstraintHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('constraint.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreateConstraintHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreateConstraintHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
