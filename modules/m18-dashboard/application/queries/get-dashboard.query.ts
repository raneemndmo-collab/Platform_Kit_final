import { BaseQuery } from '../../../../shared/cqrs';

export class GetDashboardQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly dashboardId: string,
  ) { super(tenantId); }
}
