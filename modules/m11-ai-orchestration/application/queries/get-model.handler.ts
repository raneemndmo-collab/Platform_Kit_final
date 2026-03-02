import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetModelQuery } from './get-model.query';
import { AIModel } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetModelQuery)
export class GetModelHandler implements IQueryHandler<GetModelQuery> {
  private readonly logger = new Logger(GetModelHandler.name);

  constructor(
    @InjectRepository(AIModel, 'm11_connection')
    private readonly repo: Repository<AIModel>,
  ) {}

  async execute(query: GetModelQuery): Promise<QueryResult<AIModel | null>> {
    this.logger.log(`تنفيذ GetModelHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetModelHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
