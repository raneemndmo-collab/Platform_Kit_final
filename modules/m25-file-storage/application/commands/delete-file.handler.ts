import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteFileCommand } from './delete-file.command';
import { FileMetadata } from '../../domain/entities';
import { CommandResult } from '../../../../shared/cqrs';

@CommandHandler(DeleteFileCommand)
export class DeleteFileHandler implements ICommandHandler<DeleteFileCommand> {
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    @InjectRepository(FileMetadata, 'm25_connection')
    private readonly repo: Repository<FileMetadata>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteFileCommand): Promise<CommandResult> {
    this.logger.log(`تنفيذ DeleteFileHandler: tenant=${command.tenantId} corr=${command.correlationId}`);
    try {
      const entity = this.repo.create({
        ...command.payload,
        tenantId: command.tenantId,
      });
      const saved = await this.repo.save(entity);
      this.eventEmitter.emit('file.deleted', {
        tenantId: command.tenantId,
        id: saved.id,
        correlationId: command.correlationId,
        timestamp: new Date(),
      });
      this.logger.log(`نجاح DeleteFileHandler: id=${saved.id} tenant=${command.tenantId}`);
      return { success: true, data: saved, correlationId: command.correlationId };
    } catch (error) {
      this.logger.error(`فشل DeleteFileHandler: tenant=${command.tenantId} error=${error.message}`);
      return { success: false, correlationId: command.correlationId, message: error.message };
    }
  }
}
