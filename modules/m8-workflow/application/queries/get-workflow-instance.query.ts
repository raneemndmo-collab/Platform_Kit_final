import { BaseQuery } from '../../../../shared/cqrs';

export class GetWorkflowInstanceQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly instanceId: string,
  ) { super(tenantId); }
}
