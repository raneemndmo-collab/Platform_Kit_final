import { BaseCommand } from '../../../../shared/cqrs';

export class RequestInferenceCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly capability: string,
  ) { super(tenantId, userId); }
}
