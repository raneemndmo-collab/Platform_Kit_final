import { BaseCommand } from '../../../shared/cqrs';

export class CreateArabicAiEngineCommand extends BaseCommand {
  constructor(public readonly tenantId: string, public readonly name: string, public readonly config: Record<string, any>) { super(); }
}
export class UpdateArabicAiEngineCommand extends BaseCommand {
  constructor(public readonly id: string, public readonly tenantId: string, public readonly changes: Record<string, any>) { super(); }
}
export class DeleteArabicAiEngineCommand extends BaseCommand {
  constructor(public readonly id: string, public readonly tenantId: string) { super(); }
}
