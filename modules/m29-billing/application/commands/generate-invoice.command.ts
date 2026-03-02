import { BaseCommand } from '../../../../shared/cqrs';

export class GenerateInvoiceCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly subscriptionId: string,
  ) { super(tenantId, userId); }
}
