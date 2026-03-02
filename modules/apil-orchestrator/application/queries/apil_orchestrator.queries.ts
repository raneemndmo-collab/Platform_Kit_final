import { BaseQuery } from '../../../shared/cqrs';

export class GetApilOrchestratorByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetApilOrchestratorByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
