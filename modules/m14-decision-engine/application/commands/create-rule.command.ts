// M14-DECISION-ENGINE: CreateRule Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateRuleCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly name: string,
    public readonly conditions: string,
    public readonly actions: string,
    public readonly priority: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateRuleCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ name: string; conditions: string; actions: string; priority: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteRuleCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
