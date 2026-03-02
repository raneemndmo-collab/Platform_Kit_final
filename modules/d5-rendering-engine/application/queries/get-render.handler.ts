import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetRenderQuery } from './get-render.query';
import { RenderJob } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetRenderQuery)
export class GetRenderHandler implements IQueryHandler<GetRenderQuery> {
  private readonly logger = new Logger(GetRenderHandler.name);

  constructor(
    @InjectRepository(RenderJob, 'd5_connection')
    private readonly repo: Repository<RenderJob>,
  ) {}

  async execute(query: GetRenderQuery): Promise<QueryResult<RenderJob | null>> {
    this.logger.log(`تنفيذ GetRenderHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetRenderHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
