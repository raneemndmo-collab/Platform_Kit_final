import { BaseQuery } from '../../../../shared/cqrs';

export class GetTenantQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly targetTenantId: string,
  ) { super(tenantId); }
}
