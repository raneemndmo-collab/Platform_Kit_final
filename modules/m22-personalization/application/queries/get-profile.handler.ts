import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetProfileQuery } from './get-profile.query';
import { UserProfile } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetProfileQuery)
export class GetProfileHandler implements IQueryHandler<GetProfileQuery> {
  private readonly logger = new Logger(GetProfileHandler.name);

  constructor(
    @InjectRepository(UserProfile, 'm22_connection')
    private readonly repo: Repository<UserProfile>,
  ) {}

  async execute(query: GetProfileQuery): Promise<QueryResult<UserProfile | null>> {
    this.logger.log(`تنفيذ GetProfileHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetProfileHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
