import { BaseCommand } from '../../../../shared/cqrs';

export class CreatePipelineCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly name: string,
  ) { super(tenantId, userId); }
}
