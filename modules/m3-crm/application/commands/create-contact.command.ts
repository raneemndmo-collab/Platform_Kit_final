// M3-CRM: CreateContact Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateContactCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly companyId: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateContactCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ firstName: string; lastName: string; email: string; phone: string; companyId: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteContactCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
