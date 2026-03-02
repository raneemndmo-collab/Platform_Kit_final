import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetIntegrationQuery } from './get-integration.query';
import { IntegrationAdapter } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetIntegrationQuery)
export class GetIntegrationHandler implements IQueryHandler<GetIntegrationQuery> {
  private readonly logger = new Logger(GetIntegrationHandler.name);

  constructor(
    @InjectRepository(IntegrationAdapter, 'm24_connection')
    private readonly repo: Repository<IntegrationAdapter>,
  ) {}

  async execute(query: GetIntegrationQuery): Promise<QueryResult<IntegrationAdapter | null>> {
    this.logger.log(`تنفيذ GetIntegrationHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetIntegrationHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
