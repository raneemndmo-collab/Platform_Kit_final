import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListFontsQuery } from './list-fonts.query';
import { FontFamily } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListFontsQuery)
export class ListFontsHandler implements IQueryHandler<ListFontsQuery> {
  private readonly logger = new Logger(ListFontsHandler.name);

  constructor(
    @InjectRepository(FontFamily, 'd8_connection')
    private readonly repo: Repository<FontFamily>,
  ) {}

  async execute(query: ListFontsQuery): Promise<QueryResult<[FontFamily[], number]>> {
    this.logger.log(`تنفيذ ListFontsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListFontsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
