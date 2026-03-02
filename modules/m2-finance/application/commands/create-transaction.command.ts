// M2-FINANCE: CreateTransaction Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateTransactionCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly amount: string,
    public readonly currency: string,
    public readonly type: string,
    public readonly description: string,
    public readonly accountId: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateTransactionCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ amount: string; currency: string; type: string; description: string; accountId: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteTransactionCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
