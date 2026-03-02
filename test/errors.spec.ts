// Rasid v6.4 — Error Hierarchy Tests — D2 Fix
import { RasidError, TenantNotFoundError, CircuitBreakerOpenError, TenantIsolationError } from '../shared/errors';

describe('Error Hierarchy', () => {
  it('RasidError should carry code and context', () => {
    const err = new RasidError('TEST_ERROR', 'test message', { key: 'value' });
    expect(err.code).toBe('TEST_ERROR');
    expect(err.message).toBe('test message');
    expect(err.context).toEqual({ key: 'value' });
    expect(err instanceof Error).toBe(true);
  });

  it('TenantNotFoundError should include tenantId', () => {
    const err = new TenantNotFoundError('tenant-123');
    expect(err.code).toBe('TENANT_NOT_FOUND');
    expect(err.context?.tenantId).toBe('tenant-123');
  });

  it('TenantIsolationError should capture both tenants', () => {
    const err = new TenantIsolationError('requested-tenant', 'authenticated-tenant');
    expect(err.code).toBe('TENANT_ISOLATION_VIOLATION');
  });

  it('CircuitBreakerOpenError should name the service', () => {
    const err = new CircuitBreakerOpenError('data-service');
    expect(err.code).toBe('CIRCUIT_BREAKER_OPEN');
  });
});
