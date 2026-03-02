import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDocumentQuery } from './get-document.query';
import { Document } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetDocumentQuery)
export class GetDocumentHandler implements IQueryHandler<GetDocumentQuery> {
  private readonly logger = new Logger(GetDocumentHandler.name);

  constructor(
    @InjectRepository(Document, 'm7_connection')
    private readonly repo: Repository<Document>,
  ) {}

  async execute(query: GetDocumentQuery): Promise<QueryResult<Document | null>> {
    this.logger.log(`تنفيذ GetDocumentHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetDocumentHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
