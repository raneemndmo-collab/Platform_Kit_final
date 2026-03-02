import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetClassificationQuery } from './get-classification.query';
import { SemanticNode } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetClassificationQuery)
export class GetClassificationHandler implements IQueryHandler<GetClassificationQuery> {
  private readonly logger = new Logger(GetClassificationHandler.name);

  constructor(
    @InjectRepository(SemanticNode, 'd3_connection')
    private readonly repo: Repository<SemanticNode>,
  ) {}

  async execute(query: GetClassificationQuery): Promise<QueryResult<SemanticNode | null>> {
    this.logger.log(`تنفيذ GetClassificationHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetClassificationHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
