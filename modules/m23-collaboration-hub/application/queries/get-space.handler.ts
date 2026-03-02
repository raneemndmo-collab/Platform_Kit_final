import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetSpaceQuery } from './get-space.query';
import { CollaborationChannel } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetSpaceQuery)
export class GetSpaceHandler implements IQueryHandler<GetSpaceQuery> {
  private readonly logger = new Logger(GetSpaceHandler.name);

  constructor(
    @InjectRepository(CollaborationChannel, 'm23_connection')
    private readonly repo: Repository<CollaborationChannel>,
  ) {}

  async execute(query: GetSpaceQuery): Promise<QueryResult<CollaborationChannel | null>> {
    this.logger.log(`تنفيذ GetSpaceHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetSpaceHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
