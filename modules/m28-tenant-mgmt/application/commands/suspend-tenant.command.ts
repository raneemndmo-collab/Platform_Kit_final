import { BaseCommand } from '../../../../shared/cqrs';

export class SuspendTenantCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly targetTenantId: string,
  ) { super(tenantId, userId); }
}
