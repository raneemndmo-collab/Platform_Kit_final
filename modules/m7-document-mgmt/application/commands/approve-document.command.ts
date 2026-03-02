import { BaseCommand } from '../../../../shared/cqrs';

export class ApproveDocumentCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly documentId: string,
  ) { super(tenantId, userId); }
}
