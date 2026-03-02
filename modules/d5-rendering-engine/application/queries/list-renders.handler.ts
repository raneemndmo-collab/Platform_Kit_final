import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListRendersQuery } from './list-renders.query';
import { RenderJob } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListRendersQuery)
export class ListRendersHandler implements IQueryHandler<ListRendersQuery> {
  private readonly logger = new Logger(ListRendersHandler.name);

  constructor(
    @InjectRepository(RenderJob, 'd5_connection')
    private readonly repo: Repository<RenderJob>,
  ) {}

  async execute(query: ListRendersQuery): Promise<QueryResult<[RenderJob[], number]>> {
    this.logger.log(`تنفيذ ListRendersHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListRendersHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
