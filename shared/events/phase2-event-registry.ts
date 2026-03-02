// =============================================================================
// Phase 2: Event Schema Registry
// Constitutional: ESR-001 (all events registered), ESR-003 (namespace convention)
// =============================================================================

import { EventSchema } from './phase1-event-registry';

export const PHASE2_EVENT_REGISTRY: EventSchema[] = [
  // M6: Project Management
  { name: 'project.created', namespace: 'project', module: 'M6', version: '1.0.0',
    description: 'New project created', payload: { tenantId: 'string', projectId: 'string', name: 'string', timestamp: 'Date' } },
  { name: 'project.phase.changed', namespace: 'project', module: 'M6', version: '1.0.0',
    description: 'Project phase transition', payload: { tenantId: 'string', projectId: 'string', fromPhase: 'string', toPhase: 'string', timestamp: 'Date' } },
  { name: 'project.milestone.completed', namespace: 'project', module: 'M6', version: '1.0.0',
    description: 'Project milestone completed', payload: { tenantId: 'string', projectId: 'string', milestoneId: 'string', timestamp: 'Date' } },
  // M7: Document Management
  { name: 'document.created', namespace: 'document', module: 'M7', version: '1.0.0',
    description: 'Document created', payload: { tenantId: 'string', documentId: 'string', type: 'string', timestamp: 'Date' } },
  { name: 'document.version.published', namespace: 'document', module: 'M7', version: '1.0.0',
    description: 'Document version published', payload: { tenantId: 'string', documentId: 'string', version: 'number', timestamp: 'Date' } },
  { name: 'document.approved', namespace: 'document', module: 'M7', version: '1.0.0',
    description: 'Document approved', payload: { tenantId: 'string', documentId: 'string', approvedBy: 'string', timestamp: 'Date' } },
  // M8: Workflow
  { name: 'workflow.started', namespace: 'workflow', module: 'M8', version: '1.0.0',
    description: 'Workflow instance started', payload: { tenantId: 'string', workflowId: 'string', instanceId: 'string', timestamp: 'Date' } },
  { name: 'workflow.step.completed', namespace: 'workflow', module: 'M8', version: '1.0.0',
    description: 'Workflow step completed', payload: { tenantId: 'string', instanceId: 'string', stepId: 'string', timestamp: 'Date' } },
  { name: 'workflow.completed', namespace: 'workflow', module: 'M8', version: '1.0.0',
    description: 'Workflow instance completed', payload: { tenantId: 'string', instanceId: 'string', status: 'string', timestamp: 'Date' } },
  // M9: Compliance
  { name: 'compliance.check.completed', namespace: 'compliance', module: 'M9', version: '1.0.0',
    description: 'Compliance check completed', payload: { tenantId: 'string', checkId: 'string', result: 'string', timestamp: 'Date' } },
  { name: 'compliance.violation.detected', namespace: 'compliance', module: 'M9', version: '1.0.0',
    description: 'Compliance violation detected', payload: { tenantId: 'string', violationId: 'string', severity: 'string', timestamp: 'Date' } },
  // M10: Legal Contract
  { name: 'contract.created', namespace: 'legal', module: 'M10', version: '1.0.0',
    description: 'Contract created', payload: { tenantId: 'string', contractId: 'string', type: 'string', timestamp: 'Date' } },
  { name: 'contract.signed', namespace: 'legal', module: 'M10', version: '1.0.0',
    description: 'Contract signed', payload: { tenantId: 'string', contractId: 'string', signedBy: 'string', timestamp: 'Date' } },
  // M25: File Storage
  { name: 'file.uploaded', namespace: 'filestorage', module: 'M25', version: '1.0.0',
    description: 'File uploaded', payload: { tenantId: 'string', fileId: 'string', size: 'number', mimeType: 'string', timestamp: 'Date' } },
  { name: 'file.deleted', namespace: 'filestorage', module: 'M25', version: '1.0.0',
    description: 'File deleted', payload: { tenantId: 'string', fileId: 'string', timestamp: 'Date' } },
  // M26: Scheduler
  { name: 'schedule.job.created', namespace: 'scheduler', module: 'M26', version: '1.0.0',
    description: 'Scheduled job created', payload: { tenantId: 'string', jobId: 'string', cronExpression: 'string', timestamp: 'Date' } },
  { name: 'schedule.job.executed', namespace: 'scheduler', module: 'M26', version: '1.0.0',
    description: 'Scheduled job executed', payload: { tenantId: 'string', jobId: 'string', result: 'string', timestamp: 'Date' } },
];
