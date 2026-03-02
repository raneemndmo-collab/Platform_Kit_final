import { BaseQuery } from '../../../../shared/cqrs';

export class ListProjectsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly page: number,
    public readonly limit: number,
  ) { super(tenantId); }
}
