import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetAccountQuery } from './get-account.query';
import { AccountEntity } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetAccountQuery)
export class GetAccountHandler implements IQueryHandler<GetAccountQuery> {
  private readonly logger = new Logger(GetAccountHandler.name);

  constructor(
    @InjectRepository(AccountEntity, 'm2_connection')
    private readonly repo: Repository<AccountEntity>,
  ) {}

  async execute(query: GetAccountQuery): Promise<QueryResult<AccountEntity | null>> {
    this.logger.log(`تنفيذ GetAccountHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetAccountHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
