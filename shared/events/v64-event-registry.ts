// Rasid v6.4 — Event Registry for Enhanced Modules
export const V64_EVENT_REGISTRY = {
  // APIL Orchestrator Events
  'apil.plan.created': { source: 'apil_orchestrator', payload: { tenantId: 'string', planId: 'string', mode: 'string' } },
  'apil.execution.completed': { source: 'apil_orchestrator', payload: { planId: 'string', success: 'boolean', quality: 'number' } },
  'apil.retry.triggered': { source: 'apil_orchestrator', payload: { planId: 'string', retryCount: 'number', reason: 'string' } },

  // Arabic AI Engine Events
  'arabic.adaptation.completed': { source: 'arabic_ai_engine', payload: { tenantId: 'string', sector: 'string', termsTranslated: 'number' } },
  'arabic.rtl.transformed': { source: 'arabic_ai_engine', payload: { tenantId: 'string', elementCount: 'number', structuralEquivalence: 'number' } },

  // BI Cognitive Events
  'bi.insight.generated': { source: 'bi_cognitive', payload: { dashboardId: 'string', insightType: 'string', priority: 'number' } },
  'bi.pattern.detected': { source: 'bi_cognitive', payload: { patternId: 'string', dashboards: 'string[]', correlation: 'number' } },

  // Data Intelligence Events
  'data.model.inferred': { source: 'data_intelligence', payload: { tenantId: 'string', schemaType: 'string', confidence: 'number' } },
  'data.kpi.derived': { source: 'data_intelligence', payload: { tenantId: 'string', kpiCount: 'number' } },
  'data.forecast.generated': { source: 'data_intelligence', payload: { tenantId: 'string', metric: 'string', confidence: 'number' } },

  // Data Safety Events
  'safety.alert.raised': { source: 'data_safety', payload: { tenantId: 'string', alertType: 'string', severity: 'string', field: 'string' } },
  'safety.validation.failed': { source: 'data_safety', payload: { tenantId: 'string', field: 'string', reason: 'string' } },

  // Infographic Engine Events
  'infographic.generated': { source: 'infographic_engine', payload: { tenantId: 'string', layerCount: 'number', balanceScore: 'number' } },

  // Performance Intelligence Events
  'perf.bottleneck.detected': { source: 'performance_intelligence', payload: { resource: 'string', utilization: 'number' } },
  'perf.scaling.recommended': { source: 'performance_intelligence', payload: { direction: 'string', reason: 'string' } },

  // Spreadsheet Intelligence Events
  'spreadsheet.pattern.detected': { source: 'spreadsheet_intelligence', payload: { tenantId: 'string', patternType: 'string', confidence: 'number' } },
  'spreadsheet.circular.detected': { source: 'spreadsheet_intelligence', payload: { tenantId: 'string', cycleCount: 'number' } },
  'spreadsheet.precision.issue': { source: 'spreadsheet_intelligence', payload: { tenantId: 'string', issueCount: 'number' } },
} as const;

export type V64EventName = keyof typeof V64_EVENT_REGISTRY;
export type V64EventPayload<T extends V64EventName> = typeof V64_EVENT_REGISTRY[T]['payload'];
