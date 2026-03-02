// M5-PROCUREMENT: CreatePurchaseOrder Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreatePurchaseOrderCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly vendorId: string,
    public readonly items: string,
    public readonly totalAmount: string,
    public readonly currency: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdatePurchaseOrderCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ vendorId: string; items: string; totalAmount: string; currency: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeletePurchaseOrderCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
