import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetItemQuery } from './get-item.query';
import { ItemEntity } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetItemQuery)
export class GetItemHandler implements IQueryHandler<GetItemQuery> {
  private readonly logger = new Logger(GetItemHandler.name);

  constructor(
    @InjectRepository(ItemEntity, 'm4_connection')
    private readonly repo: Repository<ItemEntity>,
  ) {}

  async execute(query: GetItemQuery): Promise<QueryResult<ItemEntity | null>> {
    this.logger.log(`تنفيذ GetItemHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetItemHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
