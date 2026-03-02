import { BaseCommand } from '../../../../shared/cqrs';

export class ExportTrailCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly payload: Record<string, any>,
  ) {
    super(tenantId, userId);
  }
}
