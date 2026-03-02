import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListDashboardsQuery } from './list-dashboards.query';
import { Dashboard } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListDashboardsQuery)
export class ListDashboardsHandler implements IQueryHandler<ListDashboardsQuery> {
  private readonly logger = new Logger(ListDashboardsHandler.name);

  constructor(
    @InjectRepository(Dashboard, 'm18_connection')
    private readonly repo: Repository<Dashboard>,
  ) {}

  async execute(query: ListDashboardsQuery): Promise<QueryResult<[Dashboard[], number]>> {
    this.logger.log(`تنفيذ ListDashboardsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListDashboardsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
