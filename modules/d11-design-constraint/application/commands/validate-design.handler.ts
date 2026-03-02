import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ValidateDesignCommand } from './validate-design.command';
import { ConstraintRule } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ValidateDesignCommand)
export class ValidateDesignHandler implements ICommandHandler<ValidateDesignCommand> {
  private readonly logger = new Logger(ValidateDesignHandler.name);

  constructor(
    @InjectRepository(ConstraintRule, 'd11_connection')
    private readonly repo: Repository<ConstraintRule>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ValidateDesignCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ValidateDesignHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('design.validate', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ValidateDesignHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ValidateDesignHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
