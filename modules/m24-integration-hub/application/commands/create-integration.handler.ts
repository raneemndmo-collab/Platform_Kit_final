import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateIntegrationCommand } from './create-integration.command';
import { IntegrationAdapter } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateIntegrationCommand)
export class CreateIntegrationHandler implements ICommandHandler<CreateIntegrationCommand> {
  private readonly logger = new Logger(CreateIntegrationHandler.name);

  constructor(
    @InjectRepository(IntegrationAdapter, 'm24_connection')
    private readonly repo: Repository<IntegrationAdapter>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateIntegrationCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreateIntegrationHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('integration.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreateIntegrationHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreateIntegrationHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
