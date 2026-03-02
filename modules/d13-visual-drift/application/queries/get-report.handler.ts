import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetReportQuery } from './get-report.query';
import { FidelityReport } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetReportQuery)
export class GetReportHandler implements IQueryHandler<GetReportQuery> {
  private readonly logger = new Logger(GetReportHandler.name);

  constructor(
    @InjectRepository(FidelityReport, 'd13_connection')
    private readonly repo: Repository<FidelityReport>,
  ) {}

  async execute(query: GetReportQuery): Promise<QueryResult<FidelityReport | null>> {
    this.logger.log(`تنفيذ GetReportHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetReportHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
