import { BaseCommand } from '../../../../shared/cqrs';

export class RunPipelineCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly pipelineId: string,
  ) { super(tenantId, userId); }
}
