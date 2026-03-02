import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListTenantsQuery } from './list-tenants.query';
import { Tenant } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListTenantsQuery)
export class ListTenantsHandler implements IQueryHandler<ListTenantsQuery> {
  private readonly logger = new Logger(ListTenantsHandler.name);

  constructor(
    @InjectRepository(Tenant, 'm28_connection')
    private readonly repo: Repository<Tenant>,
  ) {}

  async execute(query: ListTenantsQuery): Promise<QueryResult<[Tenant[], number]>> {
    this.logger.log(`تنفيذ ListTenantsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListTenantsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
