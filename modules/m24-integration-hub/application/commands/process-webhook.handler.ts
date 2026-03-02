import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProcessWebhookCommand } from './process-webhook.command';
import { IntegrationAdapter } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(ProcessWebhookCommand)
export class ProcessWebhookHandler implements ICommandHandler<ProcessWebhookCommand> {
  private readonly logger = new Logger(ProcessWebhookHandler.name);

  constructor(
    @InjectRepository(IntegrationAdapter, 'm24_connection')
    private readonly repo: Repository<IntegrationAdapter>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ProcessWebhookCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ ProcessWebhookHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('webhook.process', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح ProcessWebhookHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل ProcessWebhookHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
