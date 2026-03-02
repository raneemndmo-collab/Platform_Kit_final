import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListViolationsQuery } from './list-violations.query';
import { ComplianceFramework } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListViolationsQuery)
export class ListViolationsHandler implements IQueryHandler<ListViolationsQuery> {
  private readonly logger = new Logger(ListViolationsHandler.name);

  constructor(
    @InjectRepository(ComplianceFramework, 'm9_connection')
    private readonly repo: Repository<ComplianceFramework>,
  ) {}

  async execute(query: ListViolationsQuery): Promise<QueryResult<[ComplianceFramework[], number]>> {
    this.logger.log(`تنفيذ ListViolationsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListViolationsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
