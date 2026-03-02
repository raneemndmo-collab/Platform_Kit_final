import { BaseQuery } from '../../../../shared/cqrs';

export class GetModelStatusQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly modelId: string,
  ) { super(tenantId); }
}
