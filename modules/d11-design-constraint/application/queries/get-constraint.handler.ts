import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetConstraintQuery } from './get-constraint.query';
import { ConstraintRule } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetConstraintQuery)
export class GetConstraintHandler implements IQueryHandler<GetConstraintQuery> {
  private readonly logger = new Logger(GetConstraintHandler.name);

  constructor(
    @InjectRepository(ConstraintRule, 'd11_connection')
    private readonly repo: Repository<ConstraintRule>,
  ) {}

  async execute(query: GetConstraintQuery): Promise<QueryResult<ConstraintRule | null>> {
    this.logger.log(`تنفيذ GetConstraintHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetConstraintHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
