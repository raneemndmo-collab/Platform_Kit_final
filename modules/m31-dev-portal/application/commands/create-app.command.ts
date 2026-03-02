// M31-DEV-PORTAL: CreateApp Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateAppCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly redirectUris: string,
    public readonly scopes: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateAppCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ name: string; description: string; redirectUris: string; scopes: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteAppCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
