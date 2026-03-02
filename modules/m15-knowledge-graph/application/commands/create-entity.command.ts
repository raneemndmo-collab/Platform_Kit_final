// M15-KNOWLEDGE-GRAPH: CreateEntity Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateEntityCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly name: string,
    public readonly entityType: string,
    public readonly properties: string,
    public readonly relationships: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateEntityCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ name: string; entityType: string; properties: string; relationships: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteEntityCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
