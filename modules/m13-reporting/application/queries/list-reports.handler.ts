import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListReportsQuery } from './list-reports.query';
import { ReportDefinition } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListReportsQuery)
export class ListReportsHandler implements IQueryHandler<ListReportsQuery> {
  private readonly logger = new Logger(ListReportsHandler.name);

  constructor(
    @InjectRepository(ReportDefinition, 'm13_connection')
    private readonly repo: Repository<ReportDefinition>,
  ) {}

  async execute(query: ListReportsQuery): Promise<QueryResult<[ReportDefinition[], number]>> {
    this.logger.log(`تنفيذ ListReportsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListReportsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
