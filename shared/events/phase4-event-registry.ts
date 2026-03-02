// Phase 4: Experience + Integration Event Registry
import { EventSchema } from './phase1-event-registry';

export const PHASE4_EVENT_REGISTRY: EventSchema[] = [
  { name: 'dashboard.widget.updated', namespace: 'dashboard', module: 'M18', version: '1.0.0',
    description: 'Dashboard widget updated', payload: { tenantId: 'string', dashboardId: 'string', widgetId: 'string', timestamp: 'Date' } },
  { name: 'portal.page.published', namespace: 'portal', module: 'M19', version: '1.0.0',
    description: 'Portal page published', payload: { tenantId: 'string', pageId: 'string', timestamp: 'Date' } },
  { name: 'notification.sent', namespace: 'notifcenter', module: 'M20', version: '1.0.0',
    description: 'Notification sent', payload: { tenantId: 'string', notificationId: 'string', channel: 'string', timestamp: 'Date' } },
  { name: 'search.index.updated', namespace: 'search', module: 'M21', version: '1.0.0',
    description: 'Search index updated', payload: { tenantId: 'string', indexName: 'string', documentsIndexed: 'number', timestamp: 'Date' } },
  { name: 'personalization.profile.updated', namespace: 'personalization', module: 'M22', version: '1.0.0',
    description: 'User personalization profile updated', payload: { tenantId: 'string', profileId: 'string', timestamp: 'Date' } },
  { name: 'collaboration.space.created', namespace: 'collaboration', module: 'M23', version: '1.0.0',
    description: 'Collaboration space created', payload: { tenantId: 'string', spaceId: 'string', timestamp: 'Date' } },
  { name: 'integration.webhook.received', namespace: 'integration', module: 'M24', version: '1.0.0',
    description: 'External webhook received', payload: { tenantId: 'string', webhookId: 'string', source: 'string', timestamp: 'Date' } },
];
