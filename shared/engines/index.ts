// ═══════════════════════════════════════════════════════════════════════════════
// مجموعة محركات رصيد — Rasid Toolkit Engines
// رصيد v6.4 — 12 محرك أساسي
// ═══════════════════════════════════════════════════════════════════════════════

// 1. محرك RAG v2 — استرجاع معزز بالتوليد
export { RAGv2Engine, type RAGDocument, type RAGQuery, type RAGResult } from './rag-v2';

// 2. محرك القواعد — تقييم القواعد الديناميكية
export { RuleEngine, type Rule, type RuleCondition, type RuleAction, type RuleSetResult } from './rule-engine';

// 3. محرك الرؤى — تحليل البيانات في الوقت الفعلي (موجود مسبقاً في shared/insight-engine)
// يُستورد من: import { RealTimeInsightEngine } from '../insight-engine';

// 4. محرك التنفيذ — تنسيق المهام ومعالجة البيانات
export { ExecutionEngine, type ExecutionTask, type ExecutionPlan, type ExecutionMetrics } from './execution-engine';

// 5. محرك التحليلات — توليد الرؤى والتقارير الديناميكية
export { AnalyticsEngine, type AnalyticsQuery, type AnalyticsResult, type DataPipeline } from './analytics-engine';

// 6. محرك التقارير — تقارير متعددة الصيغ
export { ReportEngine, type ReportTemplate, type ReportJob, type ReportOutput } from './report-engine';

// 7. محرك مراقبة الأداء — مراقبة وتنبيه
export { PerformanceMonitorEngine, type PerformanceMetric, type AlertRule, type Alert, type SystemHealth } from './performance-monitor';

// 8. محرك خط أنابيب البيانات — ETL/ELT
export { DataPipelineEngine, type Pipeline, type PipelineRunResult } from './data-pipeline';

// 9. محرك معالجة اللغة الطبيعية — NLP
export { NLPEngine, type NLPResult, type ClassificationResult } from './nlp-engine';

// 10. محرك الرؤية الحاسوبية
export { VisionEngine, type VisionAnalysisResult, type OCRResult } from './vision-engine';

// 11. محرك الرسم المعرفي
export { KnowledgeGraphEngine, type GraphNode, type GraphEdge, type GraphQueryResult } from './knowledge-graph-engine';

// 12. محرك اتخاذ القرار
export { DecisionEngine, type DecisionContext, type DecisionResult, type DecisionPolicy } from './decision-engine';

// محرك سير العمل
export { WorkflowEngine, type WorkflowDefinition, type WorkflowInstance, type WorkflowStep } from './workflow-engine';

// محرك الإشعارات
export { NotificationEngine, type Notification, type NotificationTemplate, type NotificationPreference } from './notification-engine';
