// M27-AUDIT-TRAIL: CreateEntry Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateEntryCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly actorId: string,
    public readonly action: string,
    public readonly resourceType: string,
    public readonly resourceId: string,
    public readonly changes: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateEntryCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ actorId: string; action: string; resourceType: string; resourceId: string; changes: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteEntryCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
