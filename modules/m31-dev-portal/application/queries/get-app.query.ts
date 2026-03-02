// M31-DEV-PORTAL: App Queries (CQRS — Part 2)
import { BaseQuery } from '../../../../shared/cqrs';

export class GetAppQuery extends BaseQuery {
  constructor(tenantId: string, public readonly id: string) {
    super(tenantId);
  }
}

export class ListAppsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly filters?: Record<string, any>,
  ) {
    super(tenantId);
  }
}

export class SearchAppsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly query: string,
    public readonly limit: number = 20,
  ) {
    super(tenantId);
  }
}
