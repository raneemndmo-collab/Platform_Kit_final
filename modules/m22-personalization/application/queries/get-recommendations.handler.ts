import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetRecommendationsQuery } from './get-recommendations.query';
import { UserProfile } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetRecommendationsQuery)
export class GetRecommendationsHandler implements IQueryHandler<GetRecommendationsQuery> {
  private readonly logger = new Logger(GetRecommendationsHandler.name);

  constructor(
    @InjectRepository(UserProfile, 'm22_connection')
    private readonly repo: Repository<UserProfile>,
  ) {}

  async execute(query: GetRecommendationsQuery): Promise<QueryResult<UserProfile | null>> {
    this.logger.log(`تنفيذ GetRecommendationsHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetRecommendationsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
