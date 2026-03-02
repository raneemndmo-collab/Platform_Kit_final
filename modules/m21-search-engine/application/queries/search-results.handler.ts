import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchResultsQuery } from './search-results.query';
import { SearchIndex } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(SearchResultsQuery)
export class SearchResultsHandler implements IQueryHandler<SearchResultsQuery> {
  private readonly logger = new Logger(SearchResultsHandler.name);

  constructor(
    @InjectRepository(SearchIndex, 'm21_connection')
    private readonly repo: Repository<SearchIndex>,
  ) {}

  async execute(query: SearchResultsQuery): Promise<QueryResult<[SearchIndex[], number]>> {
    this.logger.log(`تنفيذ SearchResultsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل SearchResultsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
