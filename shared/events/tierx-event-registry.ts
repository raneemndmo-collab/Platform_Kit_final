// Tier X: Document Intelligence Event Registry
import { EventSchema } from './phase1-event-registry';

export const TIERX_EVENT_REGISTRY: EventSchema[] = [
  { name: 'cdr.parsed', namespace: 'cdr', module: 'D1', version: '1.0.0',
    description: 'Document parsed into CDR', payload: { tenantId: 'string', cdrId: 'string', format: 'string', fidelity: 'number', timestamp: 'Date' } },
  { name: 'cdr.validated', namespace: 'cdr', module: 'D1', version: '1.0.0',
    description: 'CDR validation completed', payload: { tenantId: 'string', cdrId: 'string', valid: 'boolean', timestamp: 'Date' } },
  { name: 'layout.analyzed', namespace: 'layout', module: 'D2', version: '1.0.0',
    description: 'Layout analysis completed', payload: { tenantId: 'string', cdrId: 'string', gridType: 'string', timestamp: 'Date' } },
  { name: 'visual.classified', namespace: 'vsm', module: 'D3', version: '1.0.0',
    description: 'Visual elements classified', payload: { tenantId: 'string', cdrId: 'string', elementCount: 'number', timestamp: 'Date' } },
  { name: 'conversion.started', namespace: 'conversion', module: 'D4', version: '1.0.0',
    description: 'Document conversion started', payload: { tenantId: 'string', jobId: 'string', sourceFormat: 'string', targetFormat: 'string', timestamp: 'Date' } },
  { name: 'conversion.completed', namespace: 'conversion', module: 'D4', version: '1.0.0',
    description: 'Document conversion completed', payload: { tenantId: 'string', jobId: 'string', fidelity: 'number', durationMs: 'number', timestamp: 'Date' } },
  { name: 'render.completed', namespace: 'render', module: 'D5', version: '1.0.0',
    description: 'Document rendered', payload: { tenantId: 'string', cdrId: 'string', format: 'string', timestamp: 'Date' } },
  { name: 'typography.resolved', namespace: 'typography', module: 'D8', version: '1.0.0',
    description: 'Typography resolution completed', payload: { tenantId: 'string', cdrId: 'string', fontsResolved: 'number', timestamp: 'Date' } },
  { name: 'translation.completed', namespace: 'translation', module: 'D10', version: '1.0.0',
    description: 'Translation & direction transformation completed', payload: { tenantId: 'string', cdrId: 'string', sourceDirection: 'string', targetDirection: 'string', timestamp: 'Date' } },
  { name: 'drift.detected', namespace: 'vdrift', module: 'D13', version: '1.0.0',
    description: 'Visual drift detected', payload: { tenantId: 'string', cdrId: 'string', driftScore: 'number', timestamp: 'Date' } },
];
