import { BaseQuery } from '../../../../shared/cqrs';

export class GetJobQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly params: Record<string, any> = {},
  ) {
    super(tenantId);
  }
}
