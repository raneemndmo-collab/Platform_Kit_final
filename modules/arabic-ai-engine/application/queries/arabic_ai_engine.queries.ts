import { BaseQuery } from '../../../shared/cqrs';

export class GetArabicAiEngineByTenantQuery extends BaseQuery {
  constructor(public readonly tenantId: string) { super(); }
}
export class GetArabicAiEngineByIdQuery extends BaseQuery {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
