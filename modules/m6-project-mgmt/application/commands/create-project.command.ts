import { BaseCommand } from '../../../../shared/cqrs';

export class CreateProjectCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly name: string,
    public readonly description: string,
  ) { super(tenantId, userId); }
}
