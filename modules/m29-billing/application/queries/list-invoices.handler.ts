import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListInvoicesQuery } from './list-invoices.query';
import { BillingPlan } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(ListInvoicesQuery)
export class ListInvoicesHandler implements IQueryHandler<ListInvoicesQuery> {
  private readonly logger = new Logger(ListInvoicesHandler.name);

  constructor(
    @InjectRepository(BillingPlan, 'm29_connection')
    private readonly repo: Repository<BillingPlan>,
  ) {}

  async execute(query: ListInvoicesQuery): Promise<QueryResult<[BillingPlan[], number]>> {
    this.logger.log(`تنفيذ ListInvoicesHandler: tenant=${query.tenantId}`);
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
      this.logger.error(`فشل ListInvoicesHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: [[], 0], total: 0, correlationId: query.correlationId };
    }
  }
}
