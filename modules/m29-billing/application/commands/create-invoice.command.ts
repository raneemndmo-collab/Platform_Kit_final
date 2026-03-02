// M29-BILLING: CreateInvoice Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateInvoiceCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly subscriptionId: string,
    public readonly amount: string,
    public readonly dueDate: string,
    public readonly items: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateInvoiceCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ subscriptionId: string; amount: string; dueDate: string; items: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteInvoiceCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
