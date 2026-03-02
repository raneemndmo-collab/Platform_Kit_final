import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetContractQuery } from './get-contract.query';
import { Contract } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetContractQuery)
export class GetContractHandler implements IQueryHandler<GetContractQuery> {
  private readonly logger = new Logger(GetContractHandler.name);

  constructor(
    @InjectRepository(Contract, 'm10_connection')
    private readonly repo: Repository<Contract>,
  ) {}

  async execute(query: GetContractQuery): Promise<QueryResult<Contract | null>> {
    this.logger.log(`تنفيذ GetContractHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetContractHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
