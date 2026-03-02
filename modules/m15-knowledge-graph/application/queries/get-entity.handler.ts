import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEntityQuery } from './get-entity.query';
import { KGNode } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetEntityQuery)
export class GetEntityHandler implements IQueryHandler<GetEntityQuery> {
  private readonly logger = new Logger(GetEntityHandler.name);

  constructor(
    @InjectRepository(KGNode, 'm15_connection')
    private readonly repo: Repository<KGNode>,
  ) {}

  async execute(query: GetEntityQuery): Promise<QueryResult<KGNode | null>> {
    this.logger.log(`تنفيذ GetEntityHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetEntityHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
