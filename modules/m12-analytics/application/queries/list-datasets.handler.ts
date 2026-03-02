import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListDatasetsQuery } from './list-datasets.query';
import { AnalyticsEvent } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListDatasetsQuery)
export class ListDatasetsHandler implements IQueryHandler<ListDatasetsQuery> {
  private readonly logger = new Logger(ListDatasetsHandler.name);

  constructor(
    @InjectRepository(AnalyticsEvent, 'm12_connection')
    private readonly repo: Repository<AnalyticsEvent>,
  ) {}

  async execute(query: ListDatasetsQuery): Promise<QueryResult<[AnalyticsEvent[], number]>> {
    this.logger.log(`تنفيذ ListDatasetsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListDatasetsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
