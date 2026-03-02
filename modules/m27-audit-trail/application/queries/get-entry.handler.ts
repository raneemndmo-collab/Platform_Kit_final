import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEntryQuery } from './get-entry.query';
import { AuditEntry } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetEntryQuery)
export class GetEntryHandler implements IQueryHandler<GetEntryQuery> {
  private readonly logger = new Logger(GetEntryHandler.name);

  constructor(
    @InjectRepository(AuditEntry, 'm27_connection')
    private readonly repo: Repository<AuditEntry>,
  ) {}

  async execute(query: GetEntryQuery): Promise<QueryResult<AuditEntry | null>> {
    this.logger.log(`تنفيذ GetEntryHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetEntryHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
