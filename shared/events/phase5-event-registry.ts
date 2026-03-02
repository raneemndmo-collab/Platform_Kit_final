// Phase 5: Hardening Event Registry
import { EventSchema } from './phase1-event-registry';

export const PHASE5_EVENT_REGISTRY: EventSchema[] = [
  { name: 'audit.trail.recorded', namespace: 'audittrail', module: 'M27', version: '1.0.0',
    description: 'Audit trail entry recorded', payload: { tenantId: 'string', trailId: 'string', action: 'string', timestamp: 'Date' } },
  { name: 'tenant.created', namespace: 'tenant', module: 'M28', version: '1.0.0',
    description: 'New tenant provisioned', payload: { tenantId: 'string', tenantName: 'string', tier: 'string', timestamp: 'Date' } },
  { name: 'tenant.suspended', namespace: 'tenant', module: 'M28', version: '1.0.0',
    description: 'Tenant suspended', payload: { tenantId: 'string', reason: 'string', timestamp: 'Date' } },
  { name: 'billing.invoice.generated', namespace: 'billing', module: 'M29', version: '1.0.0',
    description: 'Invoice generated', payload: { tenantId: 'string', invoiceId: 'string', amount: 'number', timestamp: 'Date' } },
  { name: 'billing.payment.received', namespace: 'billing', module: 'M29', version: '1.0.0',
    description: 'Payment received', payload: { tenantId: 'string', paymentId: 'string', amount: 'number', timestamp: 'Date' } },
  { name: 'devportal.app.registered', namespace: 'devportal', module: 'M31', version: '1.0.0',
    description: 'Developer app registered', payload: { tenantId: 'string', appId: 'string', timestamp: 'Date' } },
];
