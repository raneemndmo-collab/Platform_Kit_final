import { BaseCommand } from '../../../shared/cqrs';

export class CreateDataIntelligenceCommand extends BaseCommand {
  constructor(public readonly tenantId: string, public readonly name: string, public readonly config: Record<string, any>) { super(); }
}
export class UpdateDataIntelligenceCommand extends BaseCommand {
  constructor(public readonly id: string, public readonly tenantId: string, public readonly changes: Record<string, any>) { super(); }
}
export class DeleteDataIntelligenceCommand extends BaseCommand {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
