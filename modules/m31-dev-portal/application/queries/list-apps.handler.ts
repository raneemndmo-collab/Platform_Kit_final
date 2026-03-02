import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAppsQuery } from './list-apps.query';
import { ApiKey } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListAppsQuery)
export class ListAppsHandler implements IQueryHandler<ListAppsQuery> {
  private readonly logger = new Logger(ListAppsHandler.name);

  constructor(
    @InjectRepository(ApiKey, 'm31_connection')
    private readonly repo: Repository<ApiKey>,
  ) {}

  async execute(query: ListAppsQuery): Promise<QueryResult<[ApiKey[], number]>> {
    this.logger.log(`تنفيذ ListAppsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListAppsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
