import { BaseQuery } from '../../../../shared/cqrs';

export class ListBindingsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly params: Record<string, any> = {},
  ) {
    super(tenantId);
  }
}
