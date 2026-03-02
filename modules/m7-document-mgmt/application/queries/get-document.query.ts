import { BaseQuery } from '../../../../shared/cqrs';

export class GetDocumentQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly documentId: string,
  ) { super(tenantId); }
}
