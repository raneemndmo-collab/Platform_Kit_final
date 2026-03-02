import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetAssetQuery } from './get-asset.query';
import { MediaAsset } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetAssetQuery)
export class GetAssetHandler implements IQueryHandler<GetAssetQuery> {
  private readonly logger = new Logger(GetAssetHandler.name);

  constructor(
    @InjectRepository(MediaAsset, 'd6_connection')
    private readonly repo: Repository<MediaAsset>,
  ) {}

  async execute(query: GetAssetQuery): Promise<QueryResult<MediaAsset | null>> {
    this.logger.log(`تنفيذ GetAssetHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetAssetHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
