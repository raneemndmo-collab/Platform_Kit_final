import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SuspendTenantCommand } from './suspend-tenant.command';
import { Tenant } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(SuspendTenantCommand)
export class SuspendTenantHandler implements ICommandHandler<SuspendTenantCommand> {
  private readonly logger = new Logger(SuspendTenantHandler.name);

  constructor(
    @InjectRepository(Tenant, 'm28_connection')
    private readonly repo: Repository<Tenant>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: SuspendTenantCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ SuspendTenantHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('tenant.suspend', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح SuspendTenantHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل SuspendTenantHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
