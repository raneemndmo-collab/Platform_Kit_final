import { BaseQuery } from '../../../../shared/cqrs';

export class GetInvoiceQuery extends BaseQuery {
  constructor(
    tenantId: string,
    public readonly invoiceId: string,
  ) { super(tenantId); }
}
