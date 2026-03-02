import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListRulesQuery } from './list-rules.query';
import { BrandPack } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListRulesQuery)
export class ListRulesHandler implements IQueryHandler<ListRulesQuery> {
  private readonly logger = new Logger(ListRulesHandler.name);

  constructor(
    @InjectRepository(BrandPack, 'd9_connection')
    private readonly repo: Repository<BrandPack>,
  ) {}

  async execute(query: ListRulesQuery): Promise<QueryResult<[BrandPack[], number]>> {
    this.logger.log(`تنفيذ ListRulesHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListRulesHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
