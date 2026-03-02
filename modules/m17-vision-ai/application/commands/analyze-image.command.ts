import { BaseCommand } from '../../../../shared/cqrs';

export class AnalyzeImageCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly payload: Record<string, any>,
  ) {
    super(tenantId, userId);
  }
}
