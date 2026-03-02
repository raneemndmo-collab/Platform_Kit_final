import { BaseCommand } from '../../../../shared/cqrs';

export class CreateSubscriptionCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly planId: string,
  ) { super(tenantId, userId); }
}
