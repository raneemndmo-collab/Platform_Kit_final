import { BaseCommand } from '../../../shared/cqrs';

export class CreateDataSafetyCommand extends BaseCommand {
  constructor(public readonly tenantId: string, public readonly name: string, public readonly config: Record<string, any>) { super(); }
}
export class UpdateDataSafetyCommand extends BaseCommand {
  constructor(public readonly id: string, public readonly tenantId: string, public readonly changes: Record<string, any>) { super(); }
}
export class DeleteDataSafetyCommand extends BaseCommand {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
