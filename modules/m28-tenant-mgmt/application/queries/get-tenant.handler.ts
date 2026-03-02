import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetTenantQuery } from './get-tenant.query';
import { Tenant } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetTenantQuery)
export class GetTenantHandler implements IQueryHandler<GetTenantQuery> {
  private readonly logger = new Logger(GetTenantHandler.name);

  constructor(
    @InjectRepository(Tenant, 'm28_connection')
    private readonly repo: Repository<Tenant>,
  ) {}

  async execute(query: GetTenantQuery): Promise<QueryResult<Tenant | null>> {
    this.logger.log(`تنفيذ GetTenantHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetTenantHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
