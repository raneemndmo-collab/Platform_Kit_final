// ═══════════════════════════════════════════════════════════════════════════════
// محرك التقارير — Report Engine
// رصيد v6.4 — تقارير متعددة الصيغ (PDF, PPTX, Word) من بيانات حية
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';
import { CircuitBreaker } from '../../circuit-breaker';

export type ReportFormat = 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'html' | 'json' | 'csv';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface ReportTemplate {
  id: string;
  tenantId: string;
  name: string;
  format: ReportFormat;
  sections: ReportSection[];
  styles: ReportStyles;
  locale: 'ar' | 'en' | 'ar-en';
  direction: 'rtl' | 'ltr';
}

export interface ReportSection {
  id: string;
  type: 'header' | 'text' | 'table' | 'chart' | 'kpi' | 'image' | 'pagebreak' | 'footer';
  title?: string;
  dataSource?: string;
  query?: string;
  config: Record<string, unknown>;
}

export interface ReportStyles {
  primaryColor: string;
  fontFamily: string;
  fontSize: number;
  headerSize: number;
  pageSize: 'A4' | 'A3' | 'letter';
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface ReportJob {
  id: string;
  tenantId: string;
  templateId: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: Record<string, unknown>;
  outputPath?: string;
  outputSize?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  progress: number;
}

export interface ReportOutput {
  jobId: string;
  format: ReportFormat;
  content: Buffer | string;
  metadata: {
    pages: number;
    size: number;
    generatedAt: Date;
    templateName: string;
    tenantId: string;
  };
}

@Injectable()
export class ReportEngine {
  private readonly logger = new Logger(ReportEngine.name);
  private readonly breaker = new CircuitBreaker('report-engine', 5, 30000);
  private readonly templates = new BoundedMap<string, ReportTemplate[]>(5000);
  private readonly jobs = new BoundedMap<string, ReportJob>(10000);
  private readonly outputs = new BoundedMap<string, ReportOutput>(1000);

  /** تسجيل قالب تقرير */
  registerTemplate(template: ReportTemplate): ReportTemplate {
    this.logger.log(`تسجيل قالب: ${template.name} tenant=${template.tenantId}`);
    const tenantTemplates = this.templates.get(template.tenantId) || [];
    tenantTemplates.push(template);
    this.templates.set(template.tenantId, tenantTemplates);
    return template;
  }

  /** توليد تقرير من قالب وبيانات حية */
  async generateReport(
    tenantId: string,
    templateId: string,
    parameters: Record<string, unknown>,
    format?: ReportFormat,
  ): Promise<ReportJob> {
    const tenantTemplates = this.templates.get(tenantId) || [];
    const template = tenantTemplates.find(t => t.id === templateId);
    if (!template) throw new Error(`قالب غير موجود: ${templateId}`);

    const jobId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: ReportJob = {
      id: jobId,
      tenantId,
      templateId,
      status: 'pending',
      format: format || template.format,
      parameters,
      createdAt: new Date(),
      progress: 0,
    };

    this.jobs.set(jobId, job);
    this.logger.log(`بدء توليد تقرير: ${jobId} format=${job.format} tenant=${tenantId}`);

    // تنفيذ غير متزامن
    this.processReport(job, template).catch(err => {
      job.status = 'failed';
      job.error = err.message;
      this.jobs.set(jobId, job);
    });

    return job;
  }

  private async processReport(job: ReportJob, template: ReportTemplate): Promise<void> {
    return this.breaker.execute(async () => {
      job.status = 'generating';
      this.jobs.set(job.id, job);

      const sections: string[] = [];
      const totalSections = template.sections.length;

      for (let i = 0; i < template.sections.length; i++) {
        const section = template.sections[i];
        const rendered = await this.renderSection(section, job.parameters, job.tenantId);
        sections.push(rendered);
        job.progress = Math.round(((i + 1) / totalSections) * 100);
        this.jobs.set(job.id, job);
      }

      const content = this.compileReport(sections, template, job.format);

      const output: ReportOutput = {
        jobId: job.id,
        format: job.format,
        content,
        metadata: {
          pages: Math.max(1, Math.ceil(content.length / 3000)),
          size: content.length,
          generatedAt: new Date(),
          templateName: template.name,
          tenantId: job.tenantId,
        },
      };

      this.outputs.set(job.id, output);
      job.status = 'completed';
      job.completedAt = new Date();
      job.outputSize = content.length;
      job.progress = 100;
      this.jobs.set(job.id, job);
      this.logger.log(`تقرير مكتمل: ${job.id} size=${content.length}`);
    });
  }

  private async renderSection(
    section: ReportSection,
    parameters: Record<string, unknown>,
    tenantId: string,
  ): Promise<string> {
    switch (section.type) {
      case 'header':
        return `<header><h1>${section.title || ''}</h1><p>tenant: ${tenantId}</p></header>`;
      case 'text':
        return `<section><p>${this.interpolate(String(section.config.content || ''), parameters)}</p></section>`;
      case 'table':
        return this.renderTable(section, parameters);
      case 'chart':
        return this.renderChart(section, parameters);
      case 'kpi':
        return this.renderKPI(section, parameters);
      case 'pagebreak':
        return '<div class="page-break"></div>';
      case 'footer':
        return `<footer><p>${section.title || ''} — ${new Date().toISOString()}</p></footer>`;
      default:
        return '';
    }
  }

  private renderTable(section: ReportSection, params: Record<string, unknown>): string {
    const data = (params[section.dataSource || 'data'] || []) as Record<string, unknown>[];
    if (data.length === 0) return '<table><tr><td>لا توجد بيانات</td></tr></table>';
    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const rows = data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  private renderChart(section: ReportSection, params: Record<string, unknown>): string {
    return `<div class="chart" data-type="${section.config.chartType || 'bar'}" data-source="${section.dataSource}"></div>`;
  }

  private renderKPI(section: ReportSection, params: Record<string, unknown>): string {
    const value = params[String(section.config.metric)] ?? 0;
    return `<div class="kpi"><h3>${section.title}</h3><span class="value">${value}</span></div>`;
  }

  private compileReport(sections: string[], template: ReportTemplate, format: ReportFormat): string {
    const dir = template.direction || 'rtl';
    const html = `<!DOCTYPE html><html dir="${dir}" lang="${template.locale}">
<head><meta charset="utf-8"><style>
  body { font-family: ${template.styles.fontFamily}; font-size: ${template.styles.fontSize}px; direction: ${dir}; }
  h1 { font-size: ${template.styles.headerSize}px; color: ${template.styles.primaryColor}; }
  table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; }
  .kpi { text-align: center; padding: 20px; } .kpi .value { font-size: 2em; font-weight: bold; }
  .page-break { page-break-after: always; }
</style></head><body>${sections.join('\n')}</body></html>`;

    switch (format) {
      case 'html': return html;
      case 'json': return JSON.stringify({ sections, template: template.name, generatedAt: new Date() });
      case 'csv': return sections.join('\n');
      default: return html; // PDF/PPTX/DOCX يتم تحويلها عبر خدمة خارجية
    }
  }

  private interpolate(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ''));
  }

  /** الحصول على حالة التقرير */
  getJobStatus(jobId: string): ReportJob | undefined {
    return this.jobs.get(jobId);
  }

  /** تحميل مخرجات التقرير */
  getOutput(jobId: string): ReportOutput | undefined {
    return this.outputs.get(jobId);
  }

  /** قوالب المستأجر */
  getTemplates(tenantId: string): ReportTemplate[] {
    return this.templates.get(tenantId) || [];
  }
}
