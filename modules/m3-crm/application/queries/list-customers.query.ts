import { BaseQuery } from '../../../../shared/cqrs';

export class ListCustomersQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly params: Record<string, any> = {},
  ) {
    super(tenantId);
  }
}
