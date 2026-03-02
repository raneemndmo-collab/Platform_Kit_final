import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetPipelineQuery } from './get-pipeline.query';
import { AnalyticsEvent } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetPipelineQuery)
export class GetPipelineHandler implements IQueryHandler<GetPipelineQuery> {
  private readonly logger = new Logger(GetPipelineHandler.name);

  constructor(
    @InjectRepository(AnalyticsEvent, 'm12_connection')
    private readonly repo: Repository<AnalyticsEvent>,
  ) {}

  async execute(query: GetPipelineQuery): Promise<QueryResult<AnalyticsEvent | null>> {
    this.logger.log(`تنفيذ GetPipelineHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetPipelineHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
