import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetPageQuery } from './get-page.query';
import { PortalPage } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetPageQuery)
export class GetPageHandler implements IQueryHandler<GetPageQuery> {
  private readonly logger = new Logger(GetPageHandler.name);

  constructor(
    @InjectRepository(PortalPage, 'm19_connection')
    private readonly repo: Repository<PortalPage>,
  ) {}

  async execute(query: GetPageQuery): Promise<QueryResult<PortalPage | null>> {
    this.logger.log(`تنفيذ GetPageHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetPageHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
