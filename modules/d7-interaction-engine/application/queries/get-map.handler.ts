import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetMapQuery } from './get-map.query';
import { InteractionLayer } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetMapQuery)
export class GetMapHandler implements IQueryHandler<GetMapQuery> {
  private readonly logger = new Logger(GetMapHandler.name);

  constructor(
    @InjectRepository(InteractionLayer, 'd7_connection')
    private readonly repo: Repository<InteractionLayer>,
  ) {}

  async execute(query: GetMapQuery): Promise<QueryResult<InteractionLayer | null>> {
    this.logger.log(`تنفيذ GetMapHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetMapHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
