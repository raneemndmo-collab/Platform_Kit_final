import { BaseCommand } from '../../../../shared/cqrs';

export class RegisterModelCommand extends BaseCommand {
  constructor(
    tenantId: string, userId: string,
    public readonly name: string,
    public readonly provider: string,
  ) { super(tenantId, userId); }
}
