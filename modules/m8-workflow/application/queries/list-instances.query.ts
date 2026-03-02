import { BaseQuery } from '../../../../shared/cqrs';

export class ListInstancesQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly params: Record<string, any> = {},
  ) {
    super(tenantId);
  }
}
