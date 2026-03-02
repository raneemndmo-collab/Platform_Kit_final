// M24-INTEGRATION-HUB: Webhook Queries (CQRS — Part 2)
import { BaseQuery } from '../../../../shared/cqrs';

export class GetWebhookQuery extends BaseQuery {
  constructor(tenantId: string, public readonly id: string) {
    super(tenantId);
  }
}

export class ListWebhooksQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly filters?: Record<string, any>,
  ) {
    super(tenantId);
  }
}

export class SearchWebhooksQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly query: string,
    public readonly limit: number = 20,
  ) {
    super(tenantId);
  }
}
