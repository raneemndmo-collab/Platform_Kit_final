// Phase 3: Intelligence + Analytics Event Registry
import { EventSchema } from './phase1-event-registry';

export const PHASE3_EVENT_REGISTRY: EventSchema[] = [
  { name: 'ai.model.registered', namespace: 'ai', module: 'M11', version: '1.0.0',
    description: 'AI model registered', payload: { tenantId: 'string', modelId: 'string', capability: 'string', timestamp: 'Date' } },
  { name: 'ai.inference.completed', namespace: 'ai', module: 'M11', version: '1.0.0',
    description: 'AI inference completed', payload: { tenantId: 'string', requestId: 'string', capability: 'string', latencyMs: 'number', timestamp: 'Date' } },
  { name: 'ai.fallback.triggered', namespace: 'ai', module: 'M11', version: '1.0.0',
    description: 'AI fallback chain triggered', payload: { tenantId: 'string', capability: 'string', level: 'number', timestamp: 'Date' } },
  { name: 'analytics.pipeline.completed', namespace: 'analytics', module: 'M12', version: '1.0.0',
    description: 'Analytics pipeline run completed', payload: { tenantId: 'string', pipelineId: 'string', recordsProcessed: 'number', timestamp: 'Date' } },
  { name: 'report.generated', namespace: 'reporting', module: 'M13', version: '1.0.0',
    description: 'Report generated', payload: { tenantId: 'string', reportId: 'string', format: 'string', timestamp: 'Date' } },
  { name: 'decision.evaluated', namespace: 'decision', module: 'M14', version: '1.0.0',
    description: 'Decision rule evaluated', payload: { tenantId: 'string', ruleId: 'string', outcome: 'string', timestamp: 'Date' } },
  { name: 'knowledge.entity.created', namespace: 'knowledge', module: 'M15', version: '1.0.0',
    description: 'Knowledge graph entity created', payload: { tenantId: 'string', entityId: 'string', entityType: 'string', timestamp: 'Date' } },
  { name: 'nlp.analysis.completed', namespace: 'nlp', module: 'M16', version: '1.0.0',
    description: 'NLP analysis completed', payload: { tenantId: 'string', documentId: 'string', analysisType: 'string', timestamp: 'Date' } },
  { name: 'vision.analysis.completed', namespace: 'vision', module: 'M17', version: '1.0.0',
    description: 'Vision AI analysis completed', payload: { tenantId: 'string', imageId: 'string', analysisType: 'string', timestamp: 'Date' } },
];
