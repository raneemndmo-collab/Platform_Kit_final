// M22-PERSONALIZATION: CreateProfile Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateProfileCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly userId: string,
    public readonly preferences: string,
    public readonly behaviorData: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateProfileCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ userId: string; preferences: string; behaviorData: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteProfileCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
