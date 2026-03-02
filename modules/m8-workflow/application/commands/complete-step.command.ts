import { BaseCommand } from '../../../../shared/cqrs';

export class CompleteStepCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly instanceId: string,
    public readonly stepId: string,
  ) { super(tenantId, userId); }
}
