import { BaseQuery } from '../../../shared/cqrs';

export class GetBiCognitiveByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetBiCognitiveByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
