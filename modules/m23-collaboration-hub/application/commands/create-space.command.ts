// M23-COLLABORATION-HUB: CreateSpace Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateSpaceCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly name: string,
    public readonly type: string,
    public readonly members: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateSpaceCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ name: string; type: string; members: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteSpaceCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
