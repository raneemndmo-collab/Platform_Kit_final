import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetOrderQuery } from './get-order.query';
import { VendorEntity } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  private readonly logger = new Logger(GetOrderHandler.name);

  constructor(
    @InjectRepository(VendorEntity, 'm5_connection')
    private readonly repo: Repository<VendorEntity>,
  ) {}

  async execute(query: GetOrderQuery): Promise<QueryResult<VendorEntity | null>> {
    this.logger.log(`تنفيذ GetOrderHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetOrderHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
