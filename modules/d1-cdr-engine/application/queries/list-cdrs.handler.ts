import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListCdrsQuery } from './list-cdrs.query';
import { CDRDocument } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListCdrsQuery)
export class ListCdrsHandler implements IQueryHandler<ListCdrsQuery> {
  private readonly logger = new Logger(ListCdrsHandler.name);

  constructor(
    @InjectRepository(CDRDocument, 'd1_connection')
    private readonly repo: Repository<CDRDocument>,
  ) {}

  async execute(query: ListCdrsQuery): Promise<QueryResult<[CDRDocument[], number]>> {
    this.logger.log(`تنفيذ ListCdrsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListCdrsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
