import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetFileQuery } from './get-file.query';
import { FileMetadata } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetFileQuery)
export class GetFileHandler implements IQueryHandler<GetFileQuery> {
  private readonly logger = new Logger(GetFileHandler.name);

  constructor(
    @InjectRepository(FileMetadata, 'm25_connection')
    private readonly repo: Repository<FileMetadata>,
  ) {}

  async execute(query: GetFileQuery): Promise<QueryResult<FileMetadata | null>> {
    this.logger.log(`تنفيذ GetFileHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetFileHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
