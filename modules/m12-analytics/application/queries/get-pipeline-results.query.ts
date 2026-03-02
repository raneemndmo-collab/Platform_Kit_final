import { BaseQuery } from '../../../../shared/cqrs';

export class GetPipelineResultsQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly pipelineId: string,
  ) { super(tenantId); }
}
