// =============================================================================
// K4: Configuration — Domain Events
// Event Namespace: config.* (Constitutional: EVT-001)
// =============================================================================

export class ConfigChangedEvent {
  static readonly eventType = 'config.value.changed';
  static readonly namespace = 'config';
  static readonly version = 1;

  constructor(
    public readonly moduleId: string,
    public readonly key: string,
    public readonly oldValue: string,
    public readonly newValue: string,
    public readonly environment: string,
    public readonly tenantId: string,
  ) {}
}

export class FeatureFlagToggledEvent {
  static readonly eventType = 'config.feature.toggled';
  static readonly namespace = 'config';
  static readonly version = 1;

  constructor(
    public readonly flagName: string,
    public readonly enabled: boolean,
    public readonly moduleId: string,
    public readonly tenantId: string,
  ) {}
}

export class EnvironmentCreatedEvent {
  static readonly eventType = 'config.environment.created';
  static readonly namespace = 'config';
  static readonly version = 1;

  constructor(
    public readonly environmentName: string,
    public readonly tenantId: string,
  ) {}
}
