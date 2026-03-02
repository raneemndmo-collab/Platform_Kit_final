import { BaseQuery } from '../../../../shared/cqrs';

export class ListRendersQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly params: Record<string, any> = {},
  ) {
    super(tenantId);
  }
}
