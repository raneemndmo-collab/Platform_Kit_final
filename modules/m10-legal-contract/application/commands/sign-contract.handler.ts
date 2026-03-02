import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SignContractCommand } from './sign-contract.command';
import { Contract } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(SignContractCommand)
export class SignContractHandler implements ICommandHandler<SignContractCommand> {
  private readonly logger = new Logger(SignContractHandler.name);

  constructor(
    @InjectRepository(Contract, 'm10_connection')
    private readonly repo: Repository<Contract>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: SignContractCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ SignContractHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('contract.sign', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح SignContractHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل SignContractHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
