import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryGraphQuery } from './query-graph.query';
import { KGNode } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(QueryGraphQuery)
export class QueryGraphHandler implements IQueryHandler<QueryGraphQuery> {
  private readonly logger = new Logger(QueryGraphHandler.name);

  constructor(
    @InjectRepository(KGNode, 'm15_connection')
    private readonly repo: Repository<KGNode>,
  ) {}

  async execute(query: QueryGraphQuery): Promise<QueryResult<KGNode | null>> {
    this.logger.log(`تنفيذ QueryGraphHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل QueryGraphHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
