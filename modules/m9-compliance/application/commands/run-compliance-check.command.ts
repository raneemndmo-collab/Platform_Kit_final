import { BaseCommand } from '../../../../shared/cqrs';

export class RunComplianceCheckCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly ruleId: string,
  ) { super(tenantId, userId); }
}
