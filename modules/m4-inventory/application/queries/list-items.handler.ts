import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListItemsQuery } from './list-items.query';
import { ItemEntity } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListItemsQuery)
export class ListItemsHandler implements IQueryHandler<ListItemsQuery> {
  private readonly logger = new Logger(ListItemsHandler.name);

  constructor(
    @InjectRepository(ItemEntity, 'm4_connection')
    private readonly repo: Repository<ItemEntity>,
  ) {}

  async execute(query: ListItemsQuery): Promise<QueryResult<[ItemEntity[], number]>> {
    this.logger.log(`تنفيذ ListItemsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListItemsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
