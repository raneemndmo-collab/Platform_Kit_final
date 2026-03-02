import { BaseQuery } from '../../../../shared/cqrs';

export class ListViolationsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly severity: string,
  ) { super(tenantId); }
}
