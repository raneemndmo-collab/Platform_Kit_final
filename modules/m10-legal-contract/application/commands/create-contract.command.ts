// M10-LEGAL-CONTRACT: CreateContract Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateContractCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly title: string,
    public readonly type: string,
    public readonly parties: string,
    public readonly effectiveDate: string,
    public readonly value: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateContractCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ title: string; type: string; parties: string; effectiveDate: string; value: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteContractCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
