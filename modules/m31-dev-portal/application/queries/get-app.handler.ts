import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetAppQuery } from './get-app.query';
import { ApiKey } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetAppQuery)
export class GetAppHandler implements IQueryHandler<GetAppQuery> {
  private readonly logger = new Logger(GetAppHandler.name);

  constructor(
    @InjectRepository(ApiKey, 'm31_connection')
    private readonly repo: Repository<ApiKey>,
  ) {}

  async execute(query: GetAppQuery): Promise<QueryResult<ApiKey | null>> {
    this.logger.log(`تنفيذ GetAppHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetAppHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
