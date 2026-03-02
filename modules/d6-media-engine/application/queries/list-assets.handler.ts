import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAssetsQuery } from './list-assets.query';
import { MediaAsset } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListAssetsQuery)
export class ListAssetsHandler implements IQueryHandler<ListAssetsQuery> {
  private readonly logger = new Logger(ListAssetsHandler.name);

  constructor(
    @InjectRepository(MediaAsset, 'd6_connection')
    private readonly repo: Repository<MediaAsset>,
  ) {}

  async execute(query: ListAssetsQuery): Promise<QueryResult<[MediaAsset[], number]>> {
    this.logger.log(`تنفيذ ListAssetsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListAssetsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
