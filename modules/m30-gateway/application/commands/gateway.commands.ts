import { BaseCommand } from '../../../shared/cqrs';

export class RegisterRouteCommand extends BaseCommand {
  constructor(public readonly tenantId: string, public readonly path: string, public readonly target: string, public readonly method: string) { super(); }
}
export class UpdateRateLimitCommand extends BaseCommand {
  constructor(public readonly tenantId: string, public readonly routeId: string, public readonly rateLimit: { requests: number; windowMs: number }) { super(); }
}
export class ToggleRouteCommand extends BaseCommand {
  constructor(public readonly tenantId: string, public readonly routeId: string, public readonly enabled: boolean) { super(); }
}
