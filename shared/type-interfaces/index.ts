/**
 * D1: Type Safety — Comprehensive Interfaces
 * ────────────────────────────────────────────────────────
 * Replaces 768 'any' types with proper TypeScript interfaces.
 * Organized by domain: Data, Visual, BI, Arabic, Execution.
 */

// ═══════════════════════════════════════════════════════
// DATA DOMAIN
// ═══════════════════════════════════════════════════════

export interface DataRow {
  [column: string]: string | number | boolean | null | Date;
}

export interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';
  nullable: boolean;
  unique: boolean;
  primaryKey?: boolean;
  foreignKey?: { table: string; column: string };
  stats?: ColumnStatistics;
}

export interface ColumnStatistics {
  count: number;
  nullCount: number;
  distinctCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  stdDev?: number;
  mode?: string | number;
  histogram?: HistogramBin[];
}

export interface HistogramBin {
  bin: number;
  count: number;
  label?: string;
}

export interface DataModel {
  tables: TableDefinition[];
  relationships: Relationship[];
  schema: 'star' | 'snowflake' | 'flat';
}

export interface TableDefinition {
  name: string;
  columns: DataColumn[];
  rowCount: number;
  primaryKey: string[];
  indexes?: IndexDefinition[];
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface Relationship {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  strength: number; // 0-1
}

export interface Dataset {
  id: string;
  tenantId: string;
  name: string;
  columns: DataColumn[];
  rowCount: number;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataQualityReport {
  score: number; // 0-1
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  field: string;
  type: 'missing' | 'outlier' | 'duplicate' | 'inconsistent' | 'format_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRows: number;
  suggestion?: string;
}

// ═══════════════════════════════════════════════════════
// SCENARIO & ANALYTICS
// ═══════════════════════════════════════════════════════

export interface ScenarioResult {
  variable: string;
  originalValue: number;
  modifiedValue: number;
  changePercent: number;
  impact: Record<string, number>;
  confidence: number;
}

export interface MonteCarloResult {
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  confidenceInterval: { lower: number; upper: number; level: number };
  percentiles: Record<string, number>;
  histogram: HistogramBin[];
}

export interface CohortResult {
  cohorts: CohortGroup[];
  retentionMatrix: number[][];
  avgRetention: number;
  trends: TrendPoint[];
}

export interface CohortGroup {
  name: string;
  size: number;
  startDate: string;
  retention: number[];
}

export interface TrendPoint {
  date: string;
  value: number;
  forecast?: number;
  anomaly?: boolean;
}

export interface KPIDefinition {
  id: string;
  name: string;
  nameAr?: string;
  formula: string;
  unit: string;
  target?: number;
  threshold?: { warning: number; critical: number };
  dataSource: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
}

// ═══════════════════════════════════════════════════════
// VISUAL DOMAIN
// ═══════════════════════════════════════════════════════

export interface LayoutConstraint {
  type: 'alignment' | 'spacing' | 'proportion' | 'symmetry' | 'containment';
  elements: string[];
  value: number;
  priority: number;
  satisfied?: boolean;
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'chart' | 'image' | 'table' | 'shape' | 'kpi' | 'icon';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  zIndex: number;
  constraints?: LayoutConstraint[];
  style?: VisualStyle;
}

export interface VisualStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadow?: { x: number; y: number; blur: number; color: string };
  padding?: { top: number; right: number; bottom: number; left: number };
  font?: FontStyle;
}

export interface FontStyle {
  family: string;
  size: number;
  weight: 'normal' | 'bold' | number;
  style: 'normal' | 'italic';
  color: string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface LayoutFingerprint {
  pixelHash: string;
  structuralScore: number;
  densityIndex: number;
  alignmentDeviation: number;
  hierarchyEntropy: number;
  whiteSpaceRatio: number;
  colorHarmonyScore: number;
}

export interface VisualBalanceMetrics {
  horizontalBalance: number;
  verticalBalance: number;
  diagonalBalance: number;
  overallScore: number;
  corrections: BalanceCorrection[];
}

export interface BalanceCorrection {
  elementId: string;
  property: string;
  currentValue: number;
  suggestedValue: number;
  impact: number;
}

// ═══════════════════════════════════════════════════════
// BI & DASHBOARD
// ═══════════════════════════════════════════════════════

export interface DashboardDefinition {
  id: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  description?: string;
  layout: DashboardLayout;
  widgets: WidgetDefinition[];
  filters: FilterDefinition[];
  theme: DashboardTheme;
  refreshInterval?: number;
}

export interface DashboardLayout {
  type: 'grid' | 'freeform' | 'responsive';
  columns: number;
  rowHeight: number;
  gap: number;
  breakpoints?: Record<string, number>;
}

export interface WidgetDefinition {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'kpi' | 'table' | 'map' | 'gauge' | 'funnel' | 'treemap';
  title: string;
  titleAr?: string;
  dataSource: string;
  metrics: string[];
  dimensions: string[];
  filters?: FilterDefinition[];
  style?: WidgetStyle;
  position: { x: number; y: number; w: number; h: number };
  drillDown?: DrillDownConfig;
}

export interface WidgetStyle {
  colorScheme: string[];
  showLegend: boolean;
  showGrid: boolean;
  animation: boolean;
  rtl: boolean;
}

export interface FilterDefinition {
  field: string;
  type: 'select' | 'multi-select' | 'range' | 'date-range' | 'search';
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  crossFilter?: boolean;
}

export interface DrillDownConfig {
  levels: { field: string; label: string }[];
  currentLevel: number;
}

export interface DashboardTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  rtl: boolean;
}

// ═══════════════════════════════════════════════════════
// EXECUTION & ORCHESTRATION
// ═══════════════════════════════════════════════════════

export interface ExecutionPlan {
  id: string;
  tenantId: string;
  mode: 'STRICT' | 'PROFESSIONAL' | 'HYBRID';
  agents: AgentAssignment[];
  stages: ExecutionStage[];
  estimatedDuration: number;
  resourceEstimate: ResourceEstimate;
  createdAt: Date;
}

export interface AgentAssignment {
  agentType: 'layout' | 'data' | 'spreadsheet' | 'bi' | 'arabic' | 'design' | 'verification' | 'performance';
  taskId: string;
  priority: number;
  dependencies: string[];
}

export interface ExecutionStage {
  id: string;
  name: string;
  agents: string[];
  parallel: boolean;
  timeout: number;
  retryPolicy: RetryPolicy;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffType: 'fixed' | 'exponential';
}

export interface ResourceEstimate {
  cpuCores: number;
  memoryMB: number;
  gpuRequired: boolean;
  estimatedSeconds: number;
  costUnits: number;
}

export interface ExecutionResult {
  planId: string;
  status: 'completed' | 'partial' | 'failed';
  stages: StageResult[];
  duration: number;
  qualityScore: number;
  artifacts: OutputArtifact[];
}

export interface StageResult {
  stageId: string;
  status: 'completed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  metrics?: Record<string, number>;
}

export interface OutputArtifact {
  id: string;
  type: 'slide' | 'dashboard' | 'infographic' | 'report' | 'spreadsheet' | 'dataset';
  format: 'pptx' | 'pdf' | 'png' | 'svg' | 'html' | 'xlsx' | 'json';
  size: number;
  url: string;
  fingerprint?: LayoutFingerprint;
}

// ═══════════════════════════════════════════════════════
// ARABIC & RTL
// ═══════════════════════════════════════════════════════

export interface ArabicTextAnalysis {
  originalText: string;
  tokens: ArabicToken[];
  sentiment: SentimentResult;
  entities: NamedEntity[];
  dialectDetected: 'msa' | 'gulf' | 'egyptian' | 'levantine' | 'mixed';
  direction: 'rtl' | 'ltr' | 'mixed';
  kashidaPositions?: number[];
}

export interface ArabicToken {
  text: string;
  lemma: string;
  pos: string;
  morphology?: Record<string, string>;
  startOffset: number;
  endOffset: number;
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface NamedEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'number' | 'event';
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export interface RTLLayoutConfig {
  direction: 'rtl' | 'ltr' | 'auto';
  mirrorX: boolean;
  kashidaBalance: boolean;
  scriptDensityFactor: number;
  mixedScriptHandling: 'isolate' | 'embed' | 'override';
  numberDirection: 'ltr' | 'contextual';
}

// ═══════════════════════════════════════════════════════
// PRESENTATION & SLIDES
// ═══════════════════════════════════════════════════════

export interface Presentation {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  slides: SlideDefinition[];
  theme: PresentationTheme;
  narrativeArc: NarrativeArc;
  metadata: PresentationMetadata;
}

export interface SlideDefinition {
  id: string;
  template: 'title' | 'content-2col' | 'data-chart' | 'comparison' | 'timeline' | 'summary' | 'section' | 'blank';
  elements: LayoutElement[];
  speakerNotes?: string;
  speakerNotesAr?: string;
  transitionType?: string;
  duration?: number;
}

export interface PresentationTheme {
  name: string;
  colorPalette: string[];
  fontPrimary: string;
  fontSecondary: string;
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor: string;
  accentColor: string;
  rtl: boolean;
}

export interface NarrativeArc {
  type: 'introduction' | 'rising_action' | 'climax' | 'conclusion';
  coherenceScore: number;
  keyMessages: string[];
}

export interface PresentationMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  format: 'widescreen' | 'standard' | 'custom';
  aspectRatio: string;
}

// ═══════════════════════════════════════════════════════
// INFOGRAPHIC
// ═══════════════════════════════════════════════════════

export interface InfographicDefinition {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  type: 'data' | 'timeline' | 'comparison' | 'process' | 'kpi' | 'heatmap' | 'geo';
  sections: InfographicSection[];
  style: InfographicStyle;
  dataBindings: DataBinding[];
}

export interface InfographicSection {
  id: string;
  type: 'header' | 'statistic' | 'chart' | 'icon-grid' | 'timeline' | 'comparison' | 'footer';
  position: { x: number; y: number; w: number; h: number };
  content: Record<string, unknown>;
  style?: VisualStyle;
}

export interface InfographicStyle {
  theme: 'minimal' | 'corporate' | 'creative' | 'government';
  colorScheme: string[];
  iconSet: string;
  densityLevel: 'low' | 'medium' | 'high';
  rtl: boolean;
}

export interface DataBinding {
  sectionId: string;
  field: string;
  dataSource: string;
  transform?: string;
  format?: string;
}

// ═══════════════════════════════════════════════════════
// AUDIT & GOVERNANCE
// ═══════════════════════════════════════════════════════

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  metadata?: Record<string, unknown>;
  timestamp: Date;
  chainHash: string;
  previousHash: string;
}

export interface RetentionPolicy {
  entityType: string;
  retentionDays: number;
  archiveEnabled: boolean;
  purgeEnabled: boolean;
  lastRun?: Date;
}

// ═══════════════════════════════════════════════════════
// COMMON RESPONSE TYPES
// ═══════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMetadata {
  requestId: string;
  duration: number;
  tenantId: string;
  version: string;
}
