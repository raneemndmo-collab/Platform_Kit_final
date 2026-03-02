import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListJobsQuery } from './list-jobs.query';
import { ConversionJob } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListJobsQuery)
export class ListJobsHandler implements IQueryHandler<ListJobsQuery> {
  private readonly logger = new Logger(ListJobsHandler.name);

  constructor(
    @InjectRepository(ConversionJob, 'd4_connection')
    private readonly repo: Repository<ConversionJob>,
  ) {}

  async execute(query: ListJobsQuery): Promise<QueryResult<[ConversionJob[], number]>> {
    this.logger.log(`تنفيذ ListJobsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListJobsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
