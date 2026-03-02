import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetAnalysisQuery } from './get-analysis.query';
import { VisionTask } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetAnalysisQuery)
export class GetAnalysisHandler implements IQueryHandler<GetAnalysisQuery> {
  private readonly logger = new Logger(GetAnalysisHandler.name);

  constructor(
    @InjectRepository(VisionTask, 'm17_connection')
    private readonly repo: Repository<VisionTask>,
  ) {}

  async execute(query: GetAnalysisQuery): Promise<QueryResult<VisionTask | null>> {
    this.logger.log(`تنفيذ GetAnalysisHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetAnalysisHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
