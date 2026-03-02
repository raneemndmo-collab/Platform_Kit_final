import { BaseQuery } from '../../../shared/cqrs';

export class GetInfographicEngineByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetInfographicEngineByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
