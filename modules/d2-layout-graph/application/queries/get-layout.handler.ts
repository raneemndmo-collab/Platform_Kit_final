import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetLayoutQuery } from './get-layout.query';
import { LayoutGrid } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetLayoutQuery)
export class GetLayoutHandler implements IQueryHandler<GetLayoutQuery> {
  private readonly logger = new Logger(GetLayoutHandler.name);

  constructor(
    @InjectRepository(LayoutGrid, 'd2_connection')
    private readonly repo: Repository<LayoutGrid>,
  ) {}

  async execute(query: GetLayoutQuery): Promise<QueryResult<LayoutGrid | null>> {
    this.logger.log(`تنفيذ GetLayoutHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetLayoutHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
