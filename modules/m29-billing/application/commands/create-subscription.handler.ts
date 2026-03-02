import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { BillingPlan } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateSubscriptionCommand)
export class CreateSubscriptionHandler implements ICommandHandler<CreateSubscriptionCommand> {
  private readonly logger = new Logger(CreateSubscriptionHandler.name);

  constructor(
    @InjectRepository(BillingPlan, 'm29_connection')
    private readonly repo: Repository<BillingPlan>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreateSubscriptionHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('subscription.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreateSubscriptionHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreateSubscriptionHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
