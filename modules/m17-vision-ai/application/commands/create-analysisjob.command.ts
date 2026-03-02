// M17-VISION-AI: CreateAnalysisJob Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateAnalysisJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly imageRef: string,
    public readonly analysisType: string,
    public readonly modelId: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateAnalysisJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ imageRef: string; analysisType: string; modelId: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteAnalysisJobCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
