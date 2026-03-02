import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetCustomerQuery } from './get-customer.query';
import { ContactEntity } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetCustomerQuery)
export class GetCustomerHandler implements IQueryHandler<GetCustomerQuery> {
  private readonly logger = new Logger(GetCustomerHandler.name);

  constructor(
    @InjectRepository(ContactEntity, 'm3_connection')
    private readonly repo: Repository<ContactEntity>,
  ) {}

  async execute(query: GetCustomerQuery): Promise<QueryResult<ContactEntity | null>> {
    this.logger.log(`تنفيذ GetCustomerHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetCustomerHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
