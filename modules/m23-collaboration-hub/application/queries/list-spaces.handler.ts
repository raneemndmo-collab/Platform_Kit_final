import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListSpacesQuery } from './list-spaces.query';
import { CollaborationChannel } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListSpacesQuery)
export class ListSpacesHandler implements IQueryHandler<ListSpacesQuery> {
  private readonly logger = new Logger(ListSpacesHandler.name);

  constructor(
    @InjectRepository(CollaborationChannel, 'm23_connection')
    private readonly repo: Repository<CollaborationChannel>,
  ) {}

  async execute(query: ListSpacesQuery): Promise<QueryResult<[CollaborationChannel[], number]>> {
    this.logger.log(`تنفيذ ListSpacesHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListSpacesHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
