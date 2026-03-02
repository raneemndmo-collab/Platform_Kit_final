import { BaseQuery } from '../../../shared/cqrs';

export class GetSpreadsheetIntelligenceByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetSpreadsheetIntelligenceByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
