import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetRuleQuery } from './get-rule.query';
import { BrandPack } from '../../domain/entities';
import { QueryResult } from '../../../../shared/cqrs';

@QueryHandler(GetRuleQuery)
export class GetRuleHandler implements IQueryHandler<GetRuleQuery> {
  private readonly logger = new Logger(GetRuleHandler.name);

  constructor(
    @InjectRepository(BrandPack, 'd9_connection')
    private readonly repo: Repository<BrandPack>,
  ) {}

  async execute(query: GetRuleQuery): Promise<QueryResult<BrandPack | null>> {
    this.logger.log(`تنفيذ GetRuleHandler: tenant=${query.tenantId}`);
    try {
      const id = query.params?.id;
      const entity = await this.repo.findOne({
        where: { id, tenantId: query.tenantId },
      });
      return { data: entity, correlationId: query.correlationId };
    } catch (error) {
      this.logger.error(`فشل GetRuleHandler: tenant=${query.tenantId} error=${error.message}`);
      return { data: null, correlationId: query.correlationId };
    }
  }
}
