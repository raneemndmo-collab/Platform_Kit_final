// M20-NOTIFICATION-CENTER: CreateNotification Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateNotificationCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly recipientId: string,
    public readonly channel: string,
    public readonly subject: string,
    public readonly body: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateNotificationCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ recipientId: string; channel: string; subject: string; body: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteNotificationCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
