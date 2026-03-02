import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetConfigQuery } from './get-config.query';
import { FontFamily } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetConfigQuery)
export class GetConfigHandler implements IQueryHandler<GetConfigQuery> {
  private readonly logger = new Logger(GetConfigHandler.name);

  constructor(
    @InjectRepository(FontFamily, 'd8_connection')
    private readonly repo: Repository<FontFamily>,
  ) {}

  async execute(query: GetConfigQuery): Promise<QueryResult<FontFamily | null>> {
    this.logger.log(`تنفيذ GetConfigHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetConfigHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
