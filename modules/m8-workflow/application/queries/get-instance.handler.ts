import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetInstanceQuery } from './get-instance.query';
import { WorkflowDefinition } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetInstanceQuery)
export class GetInstanceHandler implements IQueryHandler<GetInstanceQuery> {
  private readonly logger = new Logger(GetInstanceHandler.name);

  constructor(
    @InjectRepository(WorkflowDefinition, 'm8_connection')
    private readonly repo: Repository<WorkflowDefinition>,
  ) {}

  async execute(query: GetInstanceQuery): Promise<QueryResult<WorkflowDefinition | null>> {
    this.logger.log(`تنفيذ GetInstanceHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetInstanceHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
