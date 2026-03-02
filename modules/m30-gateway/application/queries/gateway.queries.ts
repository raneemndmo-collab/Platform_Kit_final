import { BaseQuery } from '../../../shared/cqrs';

export class GetRoutesQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetRouteHealthQuery extends BaseQuery {
  constructor(public readonly routeId: string) { super(); }
}
export class GetGatewayMetricsQuery extends BaseQuery {
  constructor(public readonly tenantId: string, public readonly timeRange: string) { super(); }
}
