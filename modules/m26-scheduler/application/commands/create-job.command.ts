// M26-SCHEDULER: CreateJob Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly name: string,
    public readonly cronExpression: string,
    public readonly targetModule: string,
    public readonly targetAction: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ name: string; cronExpression: string; targetModule: string; targetAction: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteJobCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
