import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListBindingsQuery } from './list-bindings.query';
import { BindingTemplate } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListBindingsQuery)
export class ListBindingsHandler implements IQueryHandler<ListBindingsQuery> {
  private readonly logger = new Logger(ListBindingsHandler.name);

  constructor(
    @InjectRepository(BindingTemplate, 'd12_connection')
    private readonly repo: Repository<BindingTemplate>,
  ) {}

  async execute(query: ListBindingsQuery): Promise<QueryResult<[BindingTemplate[], number]>> {
    this.logger.log(`تنفيذ ListBindingsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListBindingsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
