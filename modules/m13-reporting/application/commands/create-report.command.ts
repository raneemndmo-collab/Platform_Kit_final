// M13-REPORTING: CreateReport Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateReportCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly name: string,
    public readonly type: string,
    public readonly queryTemplate: string,
    public readonly format: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateReportCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ name: string; type: string; queryTemplate: string; format: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteReportCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
