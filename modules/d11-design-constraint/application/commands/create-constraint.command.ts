import { BaseCommand } from '../../../../shared/cqrs';

export class CreateConstraintCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly payload: Record<string, any>,
  ) {
    super(tenantId, userId);
  }
}
