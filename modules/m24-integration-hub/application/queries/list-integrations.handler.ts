import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListIntegrationsQuery } from './list-integrations.query';
import { IntegrationAdapter } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListIntegrationsQuery)
export class ListIntegrationsHandler implements IQueryHandler<ListIntegrationsQuery> {
  private readonly logger = new Logger(ListIntegrationsHandler.name);

  constructor(
    @InjectRepository(IntegrationAdapter, 'm24_connection')
    private readonly repo: Repository<IntegrationAdapter>,
  ) {}

  async execute(query: ListIntegrationsQuery): Promise<QueryResult<[IntegrationAdapter[], number]>> {
    this.logger.log(`تنفيذ ListIntegrationsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListIntegrationsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
