import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CheckComplianceCommand } from './check-compliance.command';
import { BrandPack } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CheckComplianceCommand)
export class CheckComplianceHandler implements ICommandHandler<CheckComplianceCommand> {
  private readonly logger = new Logger(CheckComplianceHandler.name);

  constructor(
    @InjectRepository(BrandPack, 'd9_connection')
    private readonly repo: Repository<BrandPack>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CheckComplianceCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CheckComplianceHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('compliance.check', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CheckComplianceHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CheckComplianceHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
