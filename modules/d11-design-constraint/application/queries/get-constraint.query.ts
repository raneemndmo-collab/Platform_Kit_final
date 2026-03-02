import { BaseQuery } from '../../../../shared/cqrs';

export class GetConstraintQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly params: Record<string, any> = {},
  ) {
    super(tenantId);
  }
}
