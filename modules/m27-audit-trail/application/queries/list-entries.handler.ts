import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListEntriesQuery } from './list-entries.query';
import { AuditEntry } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListEntriesQuery)
export class ListEntriesHandler implements IQueryHandler<ListEntriesQuery> {
  private readonly logger = new Logger(ListEntriesHandler.name);

  constructor(
    @InjectRepository(AuditEntry, 'm27_connection')
    private readonly repo: Repository<AuditEntry>,
  ) {}

  async execute(query: ListEntriesQuery): Promise<QueryResult<[AuditEntry[], number]>> {
    this.logger.log(`تنفيذ ListEntriesHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListEntriesHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
