// M24-INTEGRATION-HUB: CreateWebhook Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateWebhookCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly sourceSystem: string,
    public readonly endpoint: string,
    public readonly eventTypes: string,
    public readonly secret: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateWebhookCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ sourceSystem: string; endpoint: string; eventTypes: string; secret: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteWebhookCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
