import { BaseQuery } from '../../../../shared/cqrs';

export class ListDocumentsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly page: number,
    public readonly limit: number,
  ) { super(tenantId); }
}
