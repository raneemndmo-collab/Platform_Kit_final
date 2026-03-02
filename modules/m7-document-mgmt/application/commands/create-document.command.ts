import { BaseCommand } from '../../../../shared/cqrs';

export class CreateDocumentCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly title: string,
    public readonly type: string,
  ) { super(tenantId, userId); }
}
