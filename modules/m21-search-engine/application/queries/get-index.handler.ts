import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetIndexQuery } from './get-index.query';
import { SearchIndex } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetIndexQuery)
export class GetIndexHandler implements IQueryHandler<GetIndexQuery> {
  private readonly logger = new Logger(GetIndexHandler.name);

  constructor(
    @InjectRepository(SearchIndex, 'm21_connection')
    private readonly repo: Repository<SearchIndex>,
  ) {}

  async execute(query: GetIndexQuery): Promise<QueryResult<SearchIndex | null>> {
    this.logger.log(`تنفيذ GetIndexHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetIndexHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
