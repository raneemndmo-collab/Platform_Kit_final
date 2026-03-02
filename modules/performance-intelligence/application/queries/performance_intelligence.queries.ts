import { BaseQuery } from '../../../shared/cqrs';

export class GetPerformanceIntelligenceByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetPerformanceIntelligenceByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
