import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListFilesQuery } from './list-files.query';
import { FileMetadata } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListFilesQuery)
export class ListFilesHandler implements IQueryHandler<ListFilesQuery> {
  private readonly logger = new Logger(ListFilesHandler.name);

  constructor(
    @InjectRepository(FileMetadata, 'm25_connection')
    private readonly repo: Repository<FileMetadata>,
  ) {}

  async execute(query: ListFilesQuery): Promise<QueryResult<[FileMetadata[], number]>> {
    this.logger.log(`تنفيذ ListFilesHandler: tenant=${query.tenantId}`);
    try {
      const skip = query.params?.skip ?? 0;
      const take = query.params?.take ?? 20;
      const result = await this.repo.findAndCount({
        where: { tenantId: query.tenantId },
        skip,
        take,
        order: { createdAt: 'DESC' },
      });
      return { data: result, total: result[1], correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل ListFilesHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
