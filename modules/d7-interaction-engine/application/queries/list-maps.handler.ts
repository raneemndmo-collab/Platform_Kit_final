import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListMapsQuery } from './list-maps.query';
import { InteractionLayer } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListMapsQuery)
export class ListMapsHandler implements IQueryHandler<ListMapsQuery> {
  private readonly logger = new Logger(ListMapsHandler.name);

  constructor(
    @InjectRepository(InteractionLayer, 'd7_connection')
    private readonly repo: Repository<InteractionLayer>,
  ) {}

  async execute(query: ListMapsQuery): Promise<QueryResult<[InteractionLayer[], number]>> {
    this.logger.log(`تنفيذ ListMapsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListMapsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
