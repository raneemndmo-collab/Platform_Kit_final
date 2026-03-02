import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDashboardQuery } from './get-dashboard.query';
import { Dashboard } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetDashboardQuery)
export class GetDashboardHandler implements IQueryHandler<GetDashboardQuery> {
  private readonly logger = new Logger(GetDashboardHandler.name);

  constructor(
    @InjectRepository(Dashboard, 'm18_connection')
    private readonly repo: Repository<Dashboard>,
  ) {}

  async execute(query: GetDashboardQuery): Promise<QueryResult<Dashboard | null>> {
    this.logger.log(`تنفيذ GetDashboardHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetDashboardHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
