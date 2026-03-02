import { BaseCommand } from '../../../../shared/cqrs';

export class StartWorkflowCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly definitionId: string,
  ) { super(tenantId, userId); }
}
