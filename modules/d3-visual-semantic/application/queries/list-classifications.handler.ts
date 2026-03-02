import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListClassificationsQuery } from './list-classifications.query';
import { SemanticNode } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListClassificationsQuery)
export class ListClassificationsHandler implements IQueryHandler<ListClassificationsQuery> {
  private readonly logger = new Logger(ListClassificationsHandler.name);

  constructor(
    @InjectRepository(SemanticNode, 'd3_connection')
    private readonly repo: Repository<SemanticNode>,
  ) {}

  async execute(query: ListClassificationsQuery): Promise<QueryResult<[SemanticNode[], number]>> {
    this.logger.log(`تنفيذ ListClassificationsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListClassificationsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
