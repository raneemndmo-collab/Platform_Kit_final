import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetCheckQuery } from './get-check.query';
import { ComplianceFramework } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetCheckQuery)
export class GetCheckHandler implements IQueryHandler<GetCheckQuery> {
  private readonly logger = new Logger(GetCheckHandler.name);

  constructor(
    @InjectRepository(ComplianceFramework, 'm9_connection')
    private readonly repo: Repository<ComplianceFramework>,
  ) {}

  async execute(query: GetCheckQuery): Promise<QueryResult<ComplianceFramework | null>> {
    this.logger.log(`تنفيذ GetCheckHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetCheckHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
