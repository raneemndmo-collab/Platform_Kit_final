import { BaseCommand } from '../../../../shared/cqrs';

export class ClassifyElementsCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly payload: Record<string, any>,
  ) {
    super(tenantId, userId);
  }
}
