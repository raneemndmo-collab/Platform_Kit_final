import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetSubscriptionQuery } from './get-subscription.query';
import { BillingPlan } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetSubscriptionQuery)
export class GetSubscriptionHandler implements IQueryHandler<GetSubscriptionQuery> {
  private readonly logger = new Logger(GetSubscriptionHandler.name);

  constructor(
    @InjectRepository(BillingPlan, 'm29_connection')
    private readonly repo: Repository<BillingPlan>,
  ) {}

  async execute(query: GetSubscriptionQuery): Promise<QueryResult<BillingPlan | null>> {
    this.logger.log(`تنفيذ GetSubscriptionHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetSubscriptionHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
