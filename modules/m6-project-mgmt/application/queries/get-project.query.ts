import { BaseQuery } from '../../../../shared/cqrs';

export class GetProjectQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly projectId: string,
  ) { super(tenantId); }
}
