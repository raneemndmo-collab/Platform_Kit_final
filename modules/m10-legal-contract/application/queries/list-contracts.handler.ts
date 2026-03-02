import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListContractsQuery } from './list-contracts.query';
import { Contract } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListContractsQuery)
export class ListContractsHandler implements IQueryHandler<ListContractsQuery> {
  private readonly logger = new Logger(ListContractsHandler.name);

  constructor(
    @InjectRepository(Contract, 'm10_connection')
    private readonly repo: Repository<Contract>,
  ) {}

  async execute(query: ListContractsQuery): Promise<QueryResult<[Contract[], number]>> {
    this.logger.log(`تنفيذ ListContractsHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListContractsHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
