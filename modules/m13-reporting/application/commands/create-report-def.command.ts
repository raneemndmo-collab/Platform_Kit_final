import { BaseCommand } from '../../../../shared/cqrs';

export class CreateReportDefCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly payload: Record<string, any>,
  ) {
    super(tenantId, userId);
  }
}
