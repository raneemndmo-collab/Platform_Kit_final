// M19-PORTAL: CreatePage Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreatePageCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly slug: string,
    public readonly title: string,
    public readonly content: string,
    public readonly status: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdatePageCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ slug: string; title: string; content: string; status: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeletePageCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
