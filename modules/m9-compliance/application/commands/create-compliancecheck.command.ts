// M9-COMPLIANCE: CreateComplianceCheck Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateComplianceCheckCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly ruleId: string,
    public readonly targetModule: string,
    public readonly evidence: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateComplianceCheckCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ ruleId: string; targetModule: string; evidence: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteComplianceCheckCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
