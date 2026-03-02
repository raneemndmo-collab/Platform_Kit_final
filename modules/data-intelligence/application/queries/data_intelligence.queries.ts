import { BaseQuery } from '../../../shared/cqrs';

export class GetDataIntelligenceByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetDataIntelligenceByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
