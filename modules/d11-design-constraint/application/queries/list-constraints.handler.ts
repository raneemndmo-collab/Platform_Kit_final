import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListConstraintsQuery } from './list-constraints.query';
import { ConstraintRule } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListConstraintsQuery)
export class ListConstraintsHandler implements IQueryHandler<ListConstraintsQuery> {
  private readonly logger = new Logger(ListConstraintsHandler.name);

  constructor(
    @InjectRepository(ConstraintRule, 'd11_connection')
    private readonly repo: Repository<ConstraintRule>,
  ) {}

  async execute(query: ListConstraintsQuery): Promise<QueryResult<[ConstraintRule[], number]>> {
    this.logger.log(`تنفيذ ListConstraintsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListConstraintsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
