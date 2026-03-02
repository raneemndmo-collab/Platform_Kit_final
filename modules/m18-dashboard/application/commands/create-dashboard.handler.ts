import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateDashboardCommand } from './create-dashboard.command';
import { Dashboard } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(CreateDashboardCommand)
export class CreateDashboardHandler implements ICommandHandler<CreateDashboardCommand> {
  private readonly logger = new Logger(CreateDashboardHandler.name);

  constructor(
    @InjectRepository(Dashboard, 'm18_connection')
    private readonly repo: Repository<Dashboard>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateDashboardCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ CreateDashboardHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('dashboard.created', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح CreateDashboardHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل CreateDashboardHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
