// M11-AI-ORCHESTRATION: CreateInferenceRequest Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateInferenceRequestCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly capability: string,
    public readonly modelId: string,
    public readonly input: string,
    public readonly priority: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateInferenceRequestCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ capability: string; modelId: string; input: string; priority: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteInferenceRequestCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
