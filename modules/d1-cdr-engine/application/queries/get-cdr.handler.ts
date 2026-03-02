import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetCdrQuery } from './get-cdr.query';
import { CDRDocument } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetCdrQuery)
export class GetCdrHandler implements IQueryHandler<GetCdrQuery> {
  private readonly logger = new Logger(GetCdrHandler.name);

  constructor(
    @InjectRepository(CDRDocument, 'd1_connection')
    private readonly repo: Repository<CDRDocument>,
  ) {}

  async execute(query: GetCdrQuery): Promise<QueryResult<CDRDocument | null>> {
    this.logger.log(`تنفيذ GetCdrHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetCdrHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
