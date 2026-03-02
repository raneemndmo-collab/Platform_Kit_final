import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetJobQuery } from './get-job.query';
import { ConversionJob } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetJobQuery)
export class GetJobHandler implements IQueryHandler<GetJobQuery> {
  private readonly logger = new Logger(GetJobHandler.name);

  constructor(
    @InjectRepository(ConversionJob, 'd4_connection')
    private readonly repo: Repository<ConversionJob>,
  ) {}

  async execute(query: GetJobQuery): Promise<QueryResult<ConversionJob | null>> {
    this.logger.log(`تنفيذ GetJobHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetJobHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
