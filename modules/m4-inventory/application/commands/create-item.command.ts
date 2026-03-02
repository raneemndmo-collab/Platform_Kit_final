// M4-INVENTORY: CreateItem Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateItemCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly quantity: string,
    public readonly warehouseId: string,
    public readonly unitPrice: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateItemCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ sku: string; name: string; quantity: string; warehouseId: string; unitPrice: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteItemCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
