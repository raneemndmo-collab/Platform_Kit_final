// ═══════════════════════════════════════════════════════════════════════════════
// توسيع محرك التقارير — Report Engine Expansion
// رصيد v6.4 — قوالب مخصصة + تقارير قطاعية + مقارنة تاريخية + ترقيم صفحات
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

// ─── قوالب مخصصة ────────────────────────────────────────────────────────────
export interface CustomTemplate {
  id: string;
  tenantId: string;
  name: string;
  nameAr: string;
  category: 'compliance' | 'financial' | 'operational' | 'sector' | 'executive' | 'custom';
  format: 'pdf' | 'pptx' | 'docx' | 'xlsx';
  locale: 'ar' | 'en' | 'ar-en';
  direction: 'rtl' | 'ltr';
  sections: TemplateSection[];
  headerConfig: HeaderConfig;
  footerConfig: FooterConfig;
  styles: TemplateStyles;
  variables: TemplateVariable[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSection {
  id: string;
  order: number;
  type: 'cover' | 'toc' | 'executive_summary' | 'data_table' | 'chart' | 'kpi_grid' | 'comparison' | 'findings' | 'recommendations' | 'appendix';
  title: string;
  titleAr: string;
  dataSource: string;
  query?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'radar' | 'heatmap' | 'gauge';
  columns?: ColumnDef[];
  filters?: Record<string, unknown>;
  pageBreakBefore?: boolean;
  conditionalFormatting?: ConditionalFormat[];
}

export interface ColumnDef {
  field: string;
  header: string;
  headerAr: string;
  width: number;
  format?: 'text' | 'number' | 'percentage' | 'date' | 'currency' | 'status';
  align?: 'left' | 'center' | 'right';
}

export interface ConditionalFormat {
  field: string;
  condition: 'gt' | 'lt' | 'eq' | 'between' | 'contains';
  value: unknown;
  style: { color?: string; backgroundColor?: string; fontWeight?: string };
}

export interface HeaderConfig {
  logo?: string;
  title: string;
  subtitle?: string;
  showDate: boolean;
  showPageNumber: boolean;
}

export interface FooterConfig {
  text: string;
  showConfidentiality: boolean;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface TemplateStyles {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  headerFontSize: number;
  pageSize: 'A4' | 'A3' | 'letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

// ─── تقارير قطاعية ──────────────────────────────────────────────────────────
export interface SectorReport {
  id: string;
  tenantId: string;
  sector: string;
  sectorAr: string;
  period: { start: Date; end: Date };
  entities: SectorEntity[];
  overallScore: number;
  benchmarkScore: number;
  ranking: number;
  totalEntities: number;
  complianceDistribution: Record<string, number>;
  topFindings: Array<{ clause: string; count: number; severity: string }>;
  recommendations: string[];
  generatedAt: Date;
}

export interface SectorEntity {
  entityId: string;
  entityName: string;
  score: number;
  previousScore: number;
  delta: number;
  riskLevel: string;
  criticalFindings: number;
}

// ─── مقارنة تاريخية ─────────────────────────────────────────────────────────
export interface HistoricalComparison {
  tenantId: string;
  entityId: string;
  periods: ComparisonPeriod[];
  trendDirection: 'improving' | 'stable' | 'declining';
  averageScore: number;
  bestPeriod: { period: string; score: number };
  worstPeriod: { period: string; score: number };
  clauseTrends: Array<{ clause: string; scores: number[]; trend: string }>;
}

export interface ComparisonPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
  overallScore: number;
  clauseScores: Record<string, number>;
  findingsCount: number;
  resolvedCount: number;
}

// ─── ترقيم صفحات ────────────────────────────────────────────────────────────
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable()
export class ReportExpansionEngine {
  private readonly logger = new Logger(ReportExpansionEngine.name);
  private readonly templateStore = new BoundedMap<string, CustomTemplate>(500);
  private readonly reportCache = new BoundedMap<string, SectorReport>(200);

  // ─── إدارة القوالب ──────────────────────────────────────────────────────
  createTemplate(template: CustomTemplate): CustomTemplate {
    template.createdAt = new Date();
    template.updatedAt = new Date();
    this.templateStore.set(`${template.tenantId}:${template.id}`, template);
    this.logger.log(`Template created: ${template.id} for tenant ${template.tenantId}`);
    return template;
  }

  getTemplate(tenantId: string, templateId: string): CustomTemplate | undefined {
    return this.templateStore.get(`${tenantId}:${templateId}`);
  }

  listTemplates(tenantId: string, category?: string): CustomTemplate[] {
    const templates: CustomTemplate[] = [];
    this.templateStore.forEach((v, k) => {
      if (k.startsWith(`${tenantId}:`)) {
        if (!category || v.category === category) templates.push(v);
      }
    });
    return templates;
  }

  updateTemplate(tenantId: string, templateId: string, updates: Partial<CustomTemplate>): CustomTemplate | null {
    const key = `${tenantId}:${templateId}`;
    const existing = this.templateStore.get(key);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.templateStore.set(key, updated);
    return updated;
  }

  deleteTemplate(tenantId: string, templateId: string): boolean {
    return this.templateStore.delete(`${tenantId}:${templateId}`);
  }

  // ─── تقارير قطاعية ────────────────────────────────────────────────────
  generateSectorReport(
    tenantId: string,
    sector: string,
    sectorAr: string,
    period: { start: Date; end: Date },
    entities: SectorEntity[],
    benchmarkScore: number,
  ): SectorReport {
    const sorted = [...entities].sort((a, b) => b.score - a.score);
    const overallScore = entities.length > 0
      ? Math.round(entities.reduce((sum, e) => sum + e.score, 0) / entities.length)
      : 0;

    const distribution: Record<string, number> = { compliant: 0, partial: 0, non_compliant: 0 };
    for (const e of entities) {
      if (e.score >= 80) distribution.compliant++;
      else if (e.score >= 50) distribution.partial++;
      else distribution.non_compliant++;
    }

    const report: SectorReport = {
      id: `SR-${tenantId}-${sector}-${Date.now()}`,
      tenantId,
      sector,
      sectorAr,
      period,
      entities: sorted,
      overallScore,
      benchmarkScore,
      ranking: 0,
      totalEntities: entities.length,
      complianceDistribution: distribution,
      topFindings: [],
      recommendations: [],
      generatedAt: new Date(),
    };

    this.reportCache.set(`${tenantId}:${sector}`, report);
    this.logger.log(`Sector report generated: ${sector} for tenant ${tenantId}, score=${overallScore}`);
    return report;
  }

  // ─── مقارنة تاريخية ──────────────────────────────────────────────────
  generateHistoricalComparison(
    tenantId: string,
    entityId: string,
    periods: ComparisonPeriod[],
  ): HistoricalComparison {
    const scores = periods.map(p => p.overallScore);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    let bestPeriod = periods[0];
    let worstPeriod = periods[0];
    for (const p of periods) {
      if (p.overallScore > bestPeriod.overallScore) bestPeriod = p;
      if (p.overallScore < worstPeriod.overallScore) worstPeriod = p;
    }

    // حساب الاتجاه
    let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
    if (scores.length >= 2) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trendDirection = secondAvg - firstAvg > 3 ? 'improving' : secondAvg - firstAvg < -3 ? 'declining' : 'stable';
    }

    // اتجاهات البنود
    const allClauses = new Set<string>();
    for (const p of periods) {
      Object.keys(p.clauseScores).forEach(c => allClauses.add(c));
    }
    const clauseTrends = Array.from(allClauses).map(clause => {
      const clauseScores = periods.map(p => p.clauseScores[clause] ?? 0);
      const first = clauseScores[0] ?? 0;
      const last = clauseScores[clauseScores.length - 1] ?? 0;
      return {
        clause,
        scores: clauseScores,
        trend: last - first > 5 ? 'improving' : last - first < -5 ? 'declining' : 'stable',
      };
    });

    return {
      tenantId,
      entityId,
      periods,
      trendDirection,
      averageScore: avgScore,
      bestPeriod: { period: bestPeriod?.label ?? '', score: bestPeriod?.overallScore ?? 0 },
      worstPeriod: { period: worstPeriod?.label ?? '', score: worstPeriod?.overallScore ?? 0 },
      clauseTrends,
    };
  }

  // ─── ترقيم صفحات ──────────────────────────────────────────────────────
  paginate<T>(items: T[], page: number, pageSize: number): PaginatedData<T> {
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: items.slice(start, end),
      total,
      page: safePage,
      pageSize,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrevious: safePage > 1,
    };
  }

  // ─── قوالب مبنية مسبقاً ───────────────────────────────────────────────
  getBuiltInTemplates(): Array<{ id: string; name: string; nameAr: string; category: string }> {
    return [
      { id: 'tpl-compliance-full', name: 'Full Compliance Report', nameAr: 'تقرير الامتثال الشامل', category: 'compliance' },
      { id: 'tpl-compliance-executive', name: 'Executive Compliance Summary', nameAr: 'ملخص الامتثال التنفيذي', category: 'compliance' },
      { id: 'tpl-sector-benchmark', name: 'Sector Benchmark Report', nameAr: 'تقرير المقارنة القطاعية', category: 'sector' },
      { id: 'tpl-historical-trend', name: 'Historical Trend Analysis', nameAr: 'تحليل الاتجاه التاريخي', category: 'compliance' },
      { id: 'tpl-risk-assessment', name: 'Risk Assessment Report', nameAr: 'تقرير تقييم المخاطر', category: 'operational' },
      { id: 'tpl-financial-audit', name: 'Financial Audit Report', nameAr: 'تقرير المراجعة المالية', category: 'financial' },
      { id: 'tpl-incident-summary', name: 'Incident Response Summary', nameAr: 'ملخص الاستجابة للحوادث', category: 'operational' },
    ];
  }
}
