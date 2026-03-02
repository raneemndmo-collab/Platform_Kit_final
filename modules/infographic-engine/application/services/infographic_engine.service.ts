// Rasid v6.4 — Infographic Engine Service — Section 6
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VisualBalanceCorrectionEngine } from '../../../../shared/balance-correction';
import { CognitiveLoadEstimator } from '../../../../shared/cognitive-load';
import { CircuitBreaker } from '../../../../shared/circuit-breaker';


@Injectable()
export class InfographicEngineService {
  private readonly breaker = new CircuitBreaker('InfographicEngineService', 5, 30000);

  private safeEmit(event: string, data: unknown): void { try { this.events.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(InfographicEngineService.name);
  private readonly balanceEngine = new VisualBalanceCorrectionEngine();
  private readonly cognitiveEstimator = new CognitiveLoadEstimator();

  constructor(
    @InjectRepository(require('../../domain/entities/infographic.entity').InfographicEntity, 'infographic_engine_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  // Section 6.1: Insight-to-Infographic Generation
  async generateFromInsights(tenantId: string, insights: Array<{ title: string; value: unknown; importance: number; type: string }>): Promise<unknown> {
    const storyline = this.buildStoryline(insights);
    const focusElement = insights.reduce((best, ins) => ins.importance > best.importance ? ins : best, insights[0]);
    const layers = [
      { id: 'bg_layer', type: 'background', elements: [{ type: 'rect', x: 0, y: 0, width: 1200, height: 800, fill: '#f8f9fa' }] },
      { id: 'content_layer', type: 'content', elements: this.distributeElements(insights, 1200, 800) },
    ];

    // Apply balance correction (GAP-05)
    const balanceReport = this.balanceEngine.analyze(
      layers[1].elements.map(e => ({ id: e.id || '', x: e.x, y: e.y, width: e.width || 100, height: e.height || 60, weight: e.importance || 1 })),
      1200, 800
    );

    // Apply cognitive load check
    const cogLoad = this.cognitiveEstimator.estimate(
      layers[1].elements.map(e => ({ x: e.x, y: e.y, width: e.width || 100, height: e.height || 60, contrast: 0.7 })),
      1200, 800
    );

    // Auto-optimize if overloaded
    let optimizedElements = layers[1].elements;
    if (cogLoad.overloaded) {
      optimizedElements = this.declutterElements(optimizedElements, cogLoad);
      this.logger.log(`Cognitive overload detected, decluttered from ${layers[1].elements.length} to ${optimizedElements.length} elements`);
    }

    // Apply balance redistribution if imbalanced (GAP-27 partial)
    if (!balanceReport.balanced) {
      optimizedElements = this.redistributeForBalance(optimizedElements, balanceReport, 1200, 800);
    }

    const entity = this.repo.create({
      tenantId, storyline, focusElement: focusElement.title,
      layers, balanceScore: balanceReport.symmetryScore,
      cognitiveScore: cogLoad.score, insights,
      status: 'generated',
    });
    const saved = await this.repo.save(entity);
    this.safeEmit('infographic.generated', { tenantId, infographicId: saved.id, elementCount: optimizedElements.length, balanced: balanceReport.balanced });
    return saved;
  }

  // Section 6.2: Visual Balance Correction (integrated)
  async correctBalance(tenantId: string, infographicId: string): Promise<unknown> {
    const infographic = await this.repo.findOne({ where: { id: infographicId, tenantId } });
    if (!infographic) throw new Error('Infographic not found');

    const contentLayer = (infographic.layers || []).find((l: unknown) => l.type === 'content');
    if (!contentLayer) return infographic;

    const elements = contentLayer.elements.map((e: unknown) => ({ id: e.id || '', x: e.x, y: e.y, width: e.width || 100, height: e.height || 60, weight: e.importance || 1 }));
    const report = this.balanceEngine.analyze(elements, 1200, 800);

    if (!report.balanced && report.suggestions.length > 0) {
      contentLayer.elements = this.redistributeForBalance(contentLayer.elements, report, 1200, 800);
      infographic.balanceScore = report.symmetryScore;
      await this.repo.save(infographic);
      this.safeEmit('infographic.balanced', { tenantId, infographicId, newScore: report.symmetryScore });
    }
    return infographic;
  }

  // Section 6.3: Cognitive Hierarchy Optimizer
  async optimizeHierarchy(tenantId: string, infographicId: string): Promise<unknown> {
    const infographic = await this.repo.findOne({ where: { id: infographicId, tenantId } });
    if (!infographic) throw new Error('Infographic not found');

    const contentLayer = (infographic.layers || []).find((l: unknown) => l.type === 'content');
    if (!contentLayer) return infographic;

    // Find most important element
    const sorted = [...contentLayer.elements].sort((a: unknown, b: unknown) => (b.importance || 0) - (a.importance || 0));
    if (sorted.length === 0) return infographic;

    // Boost primary element
    const primary = sorted[0];
    primary.fontSize = Math.max(primary.fontSize || 24, 32);
    primary.fontWeight = 'bold';
    primary.contrast = 1.0;

    // Reduce secondary elements
    for (let i = 1; i < sorted.length; i++) {
      const decay = 1 - (i / sorted.length) * 0.4;
      sorted[i].fontSize = Math.round((sorted[i].fontSize || 16) * decay);
      sorted[i].contrast = Math.max(0.4, (sorted[i].contrast || 0.8) * decay);
    }

    contentLayer.elements = sorted;
    await this.repo.save(infographic);
    this.safeEmit('infographic.hierarchy_optimized', { tenantId, infographicId, primaryElement: primary.id });
    return infographic;
  }

  async findByTenant(tenantId: string) { return this.breaker.execute(async () => { return this.repo.find({ where: { tenantId });}, order: { createdAt: 'DESC' } }); }

  private buildStoryline(insights: unknown[]): { arc: string; sections: string[] } {
    const sorted = [...insights].sort((a, b) => b.importance - a.importance);
    return { arc: sorted.length > 0 ? `Focus: ${sorted[0].title}` : 'No primary focus', sections: sorted.map(i => i.title) };
  }

  private distributeElements(insights: unknown[], canvasW: number, canvasH: number): unknown[] {
    const cols = 3;
    const padding = 40;
    const cellW = (canvasW - padding * (cols + 1)) / cols;
    return insights.map((ins, i) => ({
      id: `insight_${i}`, type: ins.type || 'stat', title: ins.title, value: ins.value,
      importance: ins.importance,
      x: padding + (i % cols) * (cellW + padding),
      y: padding + Math.floor(i / cols) * (canvasH / Math.ceil(insights.length / cols)),
      width: cellW, height: 120, fontSize: 16 + ins.importance * 4, contrast: 0.5 + ins.importance * 0.3,
    }));
  }

  private redistributeForBalance(elements: unknown[], report: unknown, canvasW: number, canvasH: number): unknown[] {
    const midX = canvasW / 2, midY = canvasH / 2;
    for (const suggestion of (report.suggestions || [])) {
      const el = elements.find((e: unknown) => e.id === suggestion.elementId);
      if (el && suggestion.type === 'move') {
        el.x += suggestion.dx || 0;
        el.y += suggestion.dy || 0;
      }
    }
    // Simple rebalancing: shift heavy quadrant elements toward center
    for (const el of elements) {
      const qx = el.x < midX ? -1 : 1;
      const qy = el.y < midY ? -1 : 1;
      el.x -= qx * 5; el.y -= qy * 3;
    }
    return elements;
  }

  private declutterElements(elements: unknown[], cogLoad: unknown): unknown[] {
    if (elements.length <= 6) return elements;
    return [...elements].sort((a: unknown, b: unknown) => (b.importance || 0) - (a.importance || 0)).slice(0, Math.max(6, Math.ceil(elements.length * 0.7)));
  }

// C: Density adjustment (Section 6.2)
  adjustElementDensity(elements: unknown[], targetDensity: number, canvasW: number, canvasH: number): unknown[] {
    const totalArea = elements.reduce((s: number, e: unknown) => s + (e.width || 0) * (e.height || 0), 0);
    const currentDensity = totalArea / (canvasW * canvasH);
    if (Math.abs(currentDensity - targetDensity) < 0.05) return elements;
    const scaleFactor = Math.sqrt(targetDensity / (currentDensity || 0.01));
    return elements.map((e: unknown) => ({
      ...e, width: Math.round(e.width * scaleFactor), height: Math.round(e.height * scaleFactor),
    }));
  }

  // C: Whitespace distribution (Section 6.2)
  distributeWhitespace(elements: unknown[], canvasW: number, canvasH: number, targetWhitespace: number = 0.3): unknown[] {
    const totalArea = elements.reduce((s: number, e: unknown) => s + (e.width || 0) * (e.height || 0), 0);
    const currentWhitespace = 1 - totalArea / (canvasW * canvasH);
    if (currentWhitespace >= targetWhitespace) return elements;
    // Need to add more whitespace — increase gaps
    const cols = 3;
    const gapX = canvasW * (targetWhitespace / 3);
    const gapY = canvasH * (targetWhitespace / 3);
    return elements.map((e: unknown, i: number) => ({
      ...e,
      x: gapX + (i % cols) * ((canvasW - 2 * gapX) / cols),
      y: gapY + Math.floor(i / cols) * ((canvasH - 2 * gapY) / Math.ceil(elements.length / cols)),
    }));
  }


  // GAP-19 FIX: Pipeline taking insights as input → infographic output
  insightToInfographic(tenantId: string, insights: Array<{ type: string; message: string; priority: number; data?: unknown }>, template: 'executive' | 'technical' | 'public' = 'executive'): {
    title: string; sections: Array<{ heading: string; visual: string; dataRef: unknown }>; layout: string; colorScheme: string;
  } {
    const sorted = [...insights].sort((a, b) => b.priority - a.priority);
    const topInsights = sorted.slice(0, 6);

    const visualMapping: Record<string, string> = {
      'spike': 'line_chart_with_annotation',
      'drop': 'line_chart_with_annotation',
      'crowding': 'heatmap',
      'correlation': 'scatter_plot',
      'kpi_reorder': 'kpi_cards',
      'readability': 'density_map',
      'anomaly': 'box_plot',
      'trend': 'area_chart',
    };

    const sections = topInsights.map(insight => ({
      heading: insight.message.substring(0, 80),
      visual: visualMapping[insight.type] || 'info_card',
      dataRef: insight.data || null,
    }));

    const layouts: Record<string, string> = {
      executive: 'grid_2x3_hero',
      technical: 'list_detailed',
      public: 'story_flow',
    };

    const colors: Record<string, string> = {
      executive: 'corporate_blue',
      technical: 'dark_mode',
      public: 'vibrant_accessible',
    };

    this.safeEmit('infographic.generated', { tenantId, insightCount: topInsights.length, template });

    return {
      title: `تقرير التحليلات - ${new Date().toLocaleDateString('ar-SA')}`,
      sections,
      layout: layouts[template],
      colorScheme: colors[template],
    };
  }
}
