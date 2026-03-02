// =============================================================================
// D3 FIX: Rasid Error Hierarchy
// Replace generic Error() with typed, traceable errors
// =============================================================================

export class RasidError extends Error {
  public readonly timestamp = new Date();
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RasidError';
  }
  toJSON() {
    return { error: this.name, code: this.code, message: this.message, timestamp: this.timestamp, context: this.context };
  }
}

// ─── Security Errors ──────────────────────────────────────────
export class TenantNotFoundError extends RasidError {
  constructor(tenantId: string) { super('TENANT_NOT_FOUND', `Tenant ${tenantId} not found`, { tenantId }); this.name = 'TenantNotFoundError'; }
}

export class TenantIsolationViolation extends RasidError {
  constructor(requestedTenant: string, actualTenant: string) {
    super('TENANT_ISOLATION_VIOLATION', `Attempted cross-tenant access: requested=${requestedTenant}, actual=${actualTenant}`, { requestedTenant, actualTenant });
    this.name = 'TenantIsolationViolation';
  }
}

export class PermissionDeniedError extends RasidError {
  constructor(userId: string, resource: string, action: string) {
    super('PERMISSION_DENIED', `User ${userId} lacks ${action} permission on ${resource}`, { userId, resource, action });
    this.name = 'PermissionDeniedError';
  }
}

// ─── Quality Gate Errors ──────────────────────────────────────
export class QualityGateFailedError extends RasidError {
  constructor(score: number, threshold: number, gate?: string) {
    super('QUALITY_GATE_FAILED', `Quality score ${score.toFixed(4)} below threshold ${threshold}${gate ? ` at gate: ${gate}` : ''}`, { score, threshold, gate });
    this.name = 'QualityGateFailedError';
  }
}

export class TripleVerificationRejectedError extends RasidError {
  constructor(reasons: string[], result?: Record<string, unknown>) {
    super('TRIPLE_VERIFICATION_REJECTED', `Deterministic rejection: ${reasons.join('; ')}`, { reasons, result });
    this.name = 'TripleVerificationRejectedError';
  }
}

// ─── Resource Errors ──────────────────────────────────────────
export class ResourceExhaustedError extends RasidError {
  constructor(resource: string, limit?: number) {
    super('RESOURCE_EXHAUSTED', `${resource} quota exceeded${limit ? ` (limit: ${limit})` : ''}`, { resource, limit });
    this.name = 'ResourceExhaustedError';
  }
}

export class ResourceNotFoundError extends RasidError {
  constructor(resourceType: string, resourceId: string) {
    super('RESOURCE_NOT_FOUND', `${resourceType} '${resourceId}' not found`, { resourceType, resourceId });
    this.name = 'ResourceNotFoundError';
  }
}

// ─── Data Errors ──────────────────────────────────────────────
export class DataValidationError extends RasidError {
  constructor(field: string, reason: string, value?: unknown) {
    super('DATA_VALIDATION_ERROR', `Validation failed for field '${field}': ${reason}`, { field, reason, value });
    this.name = 'DataValidationError';
  }
}

export class DataIntegrityError extends RasidError {
  constructor(entity: string, detail: string) {
    super('DATA_INTEGRITY_ERROR', `Data integrity violation in ${entity}: ${detail}`, { entity, detail });
    this.name = 'DataIntegrityError';
  }
}

// ─── Event Errors ─────────────────────────────────────────────
export class EventSchemaViolation extends RasidError {
  constructor(eventType: string, errors: string[]) {
    super('EVENT_SCHEMA_VIOLATION', `ESR-002: Event ${eventType} payload does not conform to schema`, { eventType, errors });
    this.name = 'EventSchemaViolation';
  }
}

export class EventDeliveryError extends RasidError {
  constructor(eventType: string, subscriber: string, cause: string) {
    super('EVENT_DELIVERY_FAILED', `Failed to deliver ${eventType} to ${subscriber}: ${cause}`, { eventType, subscriber, cause });
    this.name = 'EventDeliveryError';
  }
}

// ─── Configuration Errors ─────────────────────────────────────
export class ConfigurationError extends RasidError {
  constructor(key: string, detail: string) {
    super('CONFIGURATION_ERROR', `Configuration error for '${key}': ${detail}`, { key, detail });
    this.name = 'ConfigurationError';
  }
}
