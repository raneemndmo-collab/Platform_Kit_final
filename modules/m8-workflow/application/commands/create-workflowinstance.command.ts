// M8-WORKFLOW: CreateWorkflowInstance Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateWorkflowInstanceCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly definitionId: string,
    public readonly triggeredBy: string,
    public readonly context: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateWorkflowInstanceCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ definitionId: string; triggeredBy: string; context: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteWorkflowInstanceCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
