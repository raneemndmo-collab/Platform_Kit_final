// M16-NLP: CreateAnalysisJob Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateAnalysisJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly documentId: string,
    public readonly analysisType: string,
    public readonly language: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateAnalysisJobCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ documentId: string; analysisType: string; language: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteAnalysisJobCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
