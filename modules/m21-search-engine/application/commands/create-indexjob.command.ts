// M21-SEARCH-ENGINE: CreateIndexJob Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateIndexJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly indexName: string,
    public readonly sourceModule: string,
    public readonly documents: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateIndexJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ indexName: string; sourceModule: string; documents: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteIndexJobCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
