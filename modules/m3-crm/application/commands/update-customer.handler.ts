import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateCustomerCommand } from './update-customer.command';
import { ContactEntity } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
  private readonly logger = new Logger(UpdateCustomerHandler.name);

  constructor(
    @InjectRepository(ContactEntity, 'm3_connection')
    private readonly repo: Repository<ContactEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateCustomerCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ UpdateCustomerHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('customer.updated', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح UpdateCustomerHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل UpdateCustomerHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
