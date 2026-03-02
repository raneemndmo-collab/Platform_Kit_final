import { BaseQuery } from '../../../shared/cqrs';

export class GetDataSafetyByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetDataSafetyByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
