import { BaseCommand } from '../../../../shared/cqrs';

export class CreateTenantCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly name: string,
    public readonly tier: string,
  ) { super(tenantId, userId); }
}
