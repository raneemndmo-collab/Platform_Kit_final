import { BaseCommand } from '../../../../shared/cqrs';

export class UpdateProjectPhaseCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly projectId: string,
    public readonly newPhase: string,
  ) { super(tenantId, userId); }
}
