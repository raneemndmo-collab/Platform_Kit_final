import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAnalysesQuery } from './list-analyses.query';
import { LayoutGrid } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListAnalysesQuery)
export class ListAnalysesHandler implements IQueryHandler<ListAnalysesQuery> {
  private readonly logger = new Logger(ListAnalysesHandler.name);

  constructor(
    @InjectRepository(LayoutGrid, 'd2_connection')
    private readonly repo: Repository<LayoutGrid>,
  ) {}

  async execute(query: ListAnalysesQuery): Promise<QueryResult<[LayoutGrid[], number]>> {
    this.logger.log(`تنفيذ ListAnalysesHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListAnalysesHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
