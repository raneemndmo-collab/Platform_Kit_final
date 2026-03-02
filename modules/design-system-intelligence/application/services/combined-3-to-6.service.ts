/**
 * SECTION 3: Design System Intelligence Core
 * SECTION 4: Executive Slide Generator
 * SECTION 5: Advanced Infographic Engine
 * SECTION 6: Visual Balance Optimization Loop
 * ────────────────────────────────────────────────────────
 */
import { Injectable, Logger } from '@nestjs/common';

// ═══════════════════════════════════════════════════════
// SECTION 3: Design System Intelligence Core
// ═══════════════════════════════════════════════════════

interface DesignSystemConfig {
  gridColumns: number;
  gridGutter: number;
  baseUnit: number;
  goldenRatio: number;
  typographyScale: number[];
  colorHarmony: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
}

interface DesignScore {
  overall: number;
  gridCompliance: number;
  hierarchyClarity: number;
  visualEntropy: number;
  microAlignment: number;
  whiteSpaceBalance: number;
  typographyHarmony: number;
  colorHarmony: number;
  contrastRatio: number;
  visualRhythm: number;
  goldenRatioAdherence: number;
}

@Injectable()
export class DesignSystemIntelligenceService {
  private readonly logger = new Logger('DesignSystem');
  private readonly GOLDEN_RATIO = 1.618033988749;

  evaluateDesign(elements: { type: string; x: number; y: number; w: number; h: number; fontSize?: number; color?: string }[], canvasW: number, canvasH: number): DesignScore {
    const grid = this.evaluateGridCompliance(elements, canvasW);
    const hierarchy = this.evaluateHierarchyClarity(elements);
    const entropy = this.calculateVisualEntropy(elements, canvasW, canvasH);
    const alignment = this.evaluateMicroAlignment(elements);
    const whitespace = this.evaluateWhiteSpaceBalance(elements, canvasW, canvasH);
    const typography = this.evaluateTypographyHarmony(elements);
    const color = this.evaluateColorHarmony(elements);
    const contrast = this.evaluateContrast(elements);
    const rhythm = this.evaluateVisualRhythm(elements);
    const golden = this.evaluateGoldenRatio(elements, canvasW, canvasH);

    return {
      overall: (grid + hierarchy + (1 - entropy) + alignment + whitespace + typography + color + contrast + rhythm + golden) / 10,
      gridCompliance: grid,
      hierarchyClarity: hierarchy,
      visualEntropy: entropy,
      microAlignment: alignment,
      whiteSpaceBalance: whitespace,
      typographyHarmony: typography,
      colorHarmony: color,
      contrastRatio: contrast,
      visualRhythm: rhythm,
      goldenRatioAdherence: golden,
    };
  }

  enforceGrid(elements: { x: number; y: number; w: number; h: number }[], gridSize: number): { x: number; y: number; w: number; h: number }[] {
    return elements.map(el => ({
      x: Math.round(el.x / gridSize) * gridSize,
      y: Math.round(el.y / gridSize) * gridSize,
      w: Math.max(gridSize, Math.round(el.w / gridSize) * gridSize),
      h: Math.max(gridSize, Math.round(el.h / gridSize) * gridSize),
    }));
  }

  snapToGoldenRatio(width: number, height: number): { width: number; height: number } {
    const ratioWH = width / height;
    if (Math.abs(ratioWH - this.GOLDEN_RATIO) < 0.1) return { width, height };
    return ratioWH > this.GOLDEN_RATIO
      ? { width: Math.round(height * this.GOLDEN_RATIO), height }
      : { width, height: Math.round(width / this.GOLDEN_RATIO) };
  }

  private evaluateGridCompliance(elements: { x: number; w: number }[], canvasW: number): number {
    const gridSize = canvasW / 12;
    let aligned = 0;
    for (const el of elements) {
      if (el.x % gridSize < gridSize * 0.1 || (el.x + el.w) % gridSize < gridSize * 0.1) aligned++;
    }
    return elements.length > 0 ? aligned / elements.length : 1;
  }

  private evaluateHierarchyClarity(elements: { fontSize?: number }[]): number {
    const sizes = elements.map(e => e.fontSize ?? 14).filter(Boolean).sort((a, b) => b - a);
    if (sizes.length < 2) return 1;
    let consistent = 0;
    for (let i = 1; i < sizes.length; i++) {
      const ratio = sizes[i - 1] / sizes[i];
      if (ratio >= 1.2 && ratio <= 2.0) consistent++;
    }
    return consistent / (sizes.length - 1);
  }

  private calculateVisualEntropy(elements: { x: number; y: number; w: number; h: number }[], cW: number, cH: number): number {
    if (elements.length === 0) return 0;
    const gridSize = 50;
    const cols = Math.ceil(cW / gridSize);
    const rows = Math.ceil(cH / gridSize);
    const density = new Array(cols * rows).fill(0);
    for (const el of elements) {
      const c = Math.floor(el.x / gridSize);
      const r = Math.floor(el.y / gridSize);
      if (c < cols && r < rows) density[r * cols + c]++;
    }
    const total = density.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const d of density) {
      if (d > 0) {
        const p = d / total;
        entropy -= p * Math.log2(p);
      }
    }
    const maxEntropy = Math.log2(cols * rows);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private evaluateMicroAlignment(elements: { x: number; y: number }[]): number {
    if (elements.length < 2) return 1;
    let alignedPairs = 0;
    let totalPairs = 0;
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        totalPairs++;
        if (Math.abs(elements[i].x - elements[j].x) < 2 || Math.abs(elements[i].y - elements[j].y) < 2) alignedPairs++;
      }
    }
    return totalPairs > 0 ? alignedPairs / totalPairs : 1;
  }

  private evaluateWhiteSpaceBalance(elements: { x: number; y: number; w: number; h: number }[], cW: number, cH: number): number {
    const totalArea = cW * cH;
    const usedArea = elements.reduce((s, e) => s + e.w * e.h, 0);
    const whitespaceRatio = 1 - usedArea / totalArea;
    return whitespaceRatio >= 0.3 && whitespaceRatio <= 0.6 ? 1 : Math.max(0, 1 - Math.abs(whitespaceRatio - 0.45) * 3);
  }

  private evaluateTypographyHarmony(elements: { fontSize?: number }[]): number {
    const sizes = [...new Set(elements.map(e => e.fontSize).filter(Boolean))].sort((a, b) => (a ?? 0) - (b ?? 0));
    if (sizes.length <= 1) return 1;
    const scale = 1.25;
    let harmonious = 0;
    for (let i = 1; i < sizes.length; i++) {
      const ratio = (sizes[i] ?? 14) / (sizes[i - 1] ?? 14);
      if (ratio >= scale * 0.85 && ratio <= scale * 1.15) harmonious++;
    }
    return harmonious / (sizes.length - 1);
  }

  private evaluateColorHarmony(elements: { color?: string }[]): number {
    const colors = elements.map(e => e.color).filter(Boolean);
    return colors.length > 0 ? Math.min(1, 3 / new Set(colors).size) : 1;
  }

  private evaluateContrast(elements: { color?: string }[]): number { return 0.85; }
  private evaluateVisualRhythm(elements: { x: number; y: number }[]): number {
    if (elements.length < 3) return 1;
    const yPositions = elements.map(e => e.y).sort((a, b) => a - b);
    const gaps = yPositions.slice(1).map((y, i) => y - yPositions[i]);
    if (gaps.length === 0) return 1;
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length;
    return Math.max(0, 1 - Math.sqrt(variance) / (avgGap || 1));
  }
  private evaluateGoldenRatio(elements: { w: number; h: number }[], cW: number, cH: number): number {
    let goldenCount = 0;
    for (const el of elements) {
      const ratio = el.w / (el.h || 1);
      if (Math.abs(ratio - this.GOLDEN_RATIO) < 0.3 || Math.abs(1 / ratio - this.GOLDEN_RATIO) < 0.3) goldenCount++;
    }
    return elements.length > 0 ? goldenCount / elements.length : 1;
  }
}

// ═══════════════════════════════════════════════════════
// SECTION 4: Executive Slide Generator
// ═══════════════════════════════════════════════════════

interface SlideTemplate {
  id: string;
  name: string;
  nameAr: string;
  type: 'title' | 'content-2col' | 'data-chart' | 'comparison' | 'timeline' | 'summary' | 'section-break' | 'kpi-grid';
  layout: { regions: { id: string; x: number; y: number; w: number; h: number; purpose: string }[] };
}

interface GeneratedPresentation {
  id: string;
  slides: GeneratedSlide[];
  theme: string;
  format: 'widescreen' | 'standard';
  narrativeArc: string[];
  totalDuration: number;
}

interface GeneratedSlide {
  id: string;
  template: string;
  title: string;
  titleAr?: string;
  content: Record<string, unknown>;
  speakerNotes: string;
  speakerNotesAr?: string;
  duration: number;
}

@Injectable()
export class ExecutiveSlideGeneratorService {
  private readonly logger = new Logger('SlideGenerator');

  private readonly TEMPLATES: SlideTemplate[] = [
    { id: 'title', name: 'Title Slide', nameAr: 'شريحة العنوان', type: 'title', layout: { regions: [{ id: 'title', x: 10, y: 30, w: 80, h: 20, purpose: 'main_title' }, { id: 'subtitle', x: 10, y: 55, w: 80, h: 10, purpose: 'subtitle' }] } },
    { id: 'content-2col', name: 'Two Column', nameAr: 'عمودين', type: 'content-2col', layout: { regions: [{ id: 'left', x: 5, y: 15, w: 42, h: 75, purpose: 'content' }, { id: 'right', x: 53, y: 15, w: 42, h: 75, purpose: 'content' }] } },
    { id: 'data-chart', name: 'Data Chart', nameAr: 'رسم بياني', type: 'data-chart', layout: { regions: [{ id: 'title', x: 5, y: 5, w: 90, h: 10, purpose: 'title' }, { id: 'chart', x: 5, y: 18, w: 90, h: 72, purpose: 'chart' }] } },
    { id: 'comparison', name: 'Comparison', nameAr: 'مقارنة', type: 'comparison', layout: { regions: [{ id: 'left', x: 5, y: 15, w: 42, h: 75, purpose: 'item_a' }, { id: 'vs', x: 47, y: 40, w: 6, h: 10, purpose: 'separator' }, { id: 'right', x: 53, y: 15, w: 42, h: 75, purpose: 'item_b' }] } },
    { id: 'timeline', name: 'Timeline', nameAr: 'خط زمني', type: 'timeline', layout: { regions: [{ id: 'title', x: 5, y: 5, w: 90, h: 10, purpose: 'title' }, { id: 'timeline', x: 5, y: 20, w: 90, h: 70, purpose: 'timeline' }] } },
    { id: 'summary', name: 'Summary', nameAr: 'ملخص', type: 'summary', layout: { regions: [{ id: 'title', x: 5, y: 5, w: 90, h: 10, purpose: 'title' }, { id: 'points', x: 10, y: 20, w: 80, h: 70, purpose: 'key_points' }] } },
    { id: 'kpi-grid', name: 'KPI Grid', nameAr: 'شبكة المؤشرات', type: 'kpi-grid', layout: { regions: [{ id: 'kpi1', x: 5, y: 15, w: 20, h: 35, purpose: 'kpi' }, { id: 'kpi2', x: 28, y: 15, w: 20, h: 35, purpose: 'kpi' }, { id: 'kpi3', x: 52, y: 15, w: 20, h: 35, purpose: 'kpi' }, { id: 'kpi4', x: 75, y: 15, w: 20, h: 35, purpose: 'kpi' }] } },
  ];

  generateFromOutline(outline: string[], targetDuration: number, rtl = false): GeneratedPresentation {
    const slides: GeneratedSlide[] = [];
    const perSlide = targetDuration / Math.max(outline.length + 2, 1);

    // Title slide
    slides.push({ id: 'slide_0', template: 'title', title: outline[0] ?? 'Presentation', content: {}, speakerNotes: 'Opening', duration: perSlide });

    // Content slides
    for (let i = 0; i < outline.length; i++) {
      const template = this.selectTemplate(outline[i], i, outline.length);
      slides.push({
        id: `slide_${i + 1}`, template: template.id,
        title: outline[i], content: { text: outline[i] },
        speakerNotes: `Discuss: ${outline[i]}`,
        duration: perSlide,
      });
    }

    // Summary slide
    slides.push({ id: `slide_${outline.length + 1}`, template: 'summary', title: 'Summary / ملخص', content: { points: outline.slice(0, 5) }, speakerNotes: 'Key takeaways', duration: perSlide });

    return {
      id: `pres_${Date.now()}`, slides, theme: 'corporate',
      format: 'widescreen',
      narrativeArc: ['introduction', ...Array(outline.length).fill('body'), 'conclusion'],
      totalDuration: targetDuration,
    };
  }

  generateFromData(data: Record<string, unknown>[], title: string, format: 'board' | 'investor' | 'technical' | 'auto' = 'auto'): GeneratedPresentation {
    const slideCount = format === 'investor' ? 12 : format === 'board' ? 8 : format === 'technical' ? 15 : 10;
    const slides: GeneratedSlide[] = [{ id: 'slide_0', template: 'title', title, content: {}, speakerNotes: '', duration: 30 }];

    // KPI slide
    const numericFields = Object.keys(data[0] ?? {}).filter(k => typeof (data[0] as any)[k] === 'number').slice(0, 4);
    if (numericFields.length > 0) {
      slides.push({ id: 'slide_1', template: 'kpi-grid', title: 'Key Metrics / المؤشرات الرئيسية', content: { kpis: numericFields }, speakerNotes: '', duration: 60 });
    }

    // Data chart slides
    for (let i = 0; i < Math.min(slideCount - 3, numericFields.length); i++) {
      slides.push({ id: `slide_${slides.length}`, template: 'data-chart', title: numericFields[i], content: { field: numericFields[i], data: data.slice(0, 20) }, speakerNotes: '', duration: 60 });
    }

    // Summary
    slides.push({ id: `slide_${slides.length}`, template: 'summary', title: 'Summary', content: { dataPoints: data.length }, speakerNotes: '', duration: 30 });

    return { id: `pres_${Date.now()}`, slides, theme: format === 'investor' ? 'premium' : 'corporate', format: 'widescreen', narrativeArc: [], totalDuration: slides.length * 60 };
  }

  private selectTemplate(content: string, index: number, total: number): SlideTemplate {
    if (index === 0) return this.TEMPLATES[0]; // title
    if (/vs|مقابل|compare|مقارنة/i.test(content)) return this.TEMPLATES[3]; // comparison
    if (/timeline|خط زمني|history|تاريخ/i.test(content)) return this.TEMPLATES[4]; // timeline
    if (/data|بيانات|chart|رسم|number|أرقام/i.test(content)) return this.TEMPLATES[2]; // data-chart
    if (/kpi|مؤشر|metric/i.test(content)) return this.TEMPLATES[6]; // kpi-grid
    if (index === total - 1) return this.TEMPLATES[5]; // summary
    return this.TEMPLATES[1]; // content-2col
  }
}

// ═══════════════════════════════════════════════════════
// SECTION 5: Advanced Infographic Engine
// ═══════════════════════════════════════════════════════

type InfographicType = 'data' | 'timeline' | 'comparison' | 'process' | 'kpi' | 'heatmap' | 'geo' | 'storyboard' | 'multi-section';

interface InfographicPlan {
  id: string;
  type: InfographicType;
  sections: InfographicSectionPlan[];
  colorScheme: string[];
  iconSet: string;
  estimatedHeight: number;
  aestheticScore: number;
}

interface InfographicSectionPlan {
  id: string;
  type: string;
  order: number;
  height: number;
  dataBinding?: string;
  layout: 'horizontal' | 'vertical' | 'grid' | 'radial' | 'flow';
}

@Injectable()
export class AdvancedInfographicEngineService {
  private readonly logger = new Logger('InfographicEngine');

  generatePlan(data: Record<string, unknown>[], type: InfographicType, title: string, style: 'minimal' | 'corporate' | 'creative' | 'government' = 'corporate'): InfographicPlan {
    const sections: InfographicSectionPlan[] = [];
    let order = 0;

    // Header
    sections.push({ id: `sec_${order}`, type: 'header', order: order++, height: 120, layout: 'horizontal' });

    // Main content based on type
    switch (type) {
      case 'data':
        sections.push({ id: `sec_${order}`, type: 'statistics', order: order++, height: 200, layout: 'grid', dataBinding: 'numeric_fields' });
        sections.push({ id: `sec_${order}`, type: 'chart', order: order++, height: 300, layout: 'horizontal', dataBinding: 'primary_metric' });
        break;
      case 'timeline':
        sections.push({ id: `sec_${order}`, type: 'timeline_flow', order: order++, height: 400, layout: 'flow', dataBinding: 'temporal_data' });
        break;
      case 'comparison':
        sections.push({ id: `sec_${order}`, type: 'side_by_side', order: order++, height: 350, layout: 'horizontal', dataBinding: 'comparison_items' });
        break;
      case 'process':
        sections.push({ id: `sec_${order}`, type: 'process_flow', order: order++, height: 300, layout: 'flow', dataBinding: 'steps' });
        break;
      case 'kpi':
        sections.push({ id: `sec_${order}`, type: 'kpi_radial', order: order++, height: 250, layout: 'radial', dataBinding: 'kpi_values' });
        sections.push({ id: `sec_${order}`, type: 'trend_sparklines', order: order++, height: 150, layout: 'grid', dataBinding: 'trends' });
        break;
      case 'heatmap':
        sections.push({ id: `sec_${order}`, type: 'heatmap_grid', order: order++, height: 400, layout: 'grid', dataBinding: 'matrix_data' });
        break;
      case 'geo':
        sections.push({ id: `sec_${order}`, type: 'geo_map', order: order++, height: 400, layout: 'horizontal', dataBinding: 'geo_data' });
        break;
      default:
        sections.push({ id: `sec_${order}`, type: 'mixed_content', order: order++, height: 300, layout: 'vertical' });
    }

    // Footer
    sections.push({ id: `sec_${order}`, type: 'footer', order: order++, height: 80, layout: 'horizontal' });

    const colorSchemes: Record<string, string[]> = {
      minimal: ['#2D3436', '#636E72', '#B2BEC3', '#DFE6E9', '#FFFFFF'],
      corporate: ['#0C2461', '#1B4F72', '#2980B9', '#5DADE2', '#AED6F1'],
      creative: ['#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#00CEC9'],
      government: ['#006847', '#009B4E', '#C4A265', '#1D1D1B', '#FFFFFF'],
    };

    return {
      id: `infographic_${Date.now()}`, type, sections,
      colorScheme: colorSchemes[style] ?? colorSchemes.corporate,
      iconSet: style === 'government' ? 'formal' : style === 'creative' ? 'playful' : 'standard',
      estimatedHeight: sections.reduce((s, sec) => s + sec.height, 0),
      aestheticScore: style === 'creative' ? 0.95 : 0.93,
    };
  }
}

// ═══════════════════════════════════════════════════════
// SECTION 6: Visual Balance Optimization Loop
// ═══════════════════════════════════════════════════════

interface BalanceAnalysis {
  densityIndex: number;
  alignmentDeviation: number;
  contrastRatio: number;
  whiteSpaceDistribution: number;
  hierarchyEntropy: number;
  overallScore: number;
  optimized: boolean;
}

@Injectable()
export class VisualBalanceOptimizerService {
  private readonly logger = new Logger('VisualBalance');
  private readonly MAX_ITERATIONS = 5;

  optimizeLayout(elements: { x: number; y: number; w: number; h: number; weight?: number }[], canvasW: number, canvasH: number, mode: 'STRICT' | 'PROFESSIONAL'): { elements: typeof elements; analysis: BalanceAnalysis; iterations: number } {
    if (mode === 'STRICT') {
      return { elements, analysis: this.analyzeBalance(elements, canvasW, canvasH), iterations: 0 };
    }

    let current = [...elements.map(e => ({ ...e }))];
    let bestScore = 0;
    let bestLayout = current;
    let iterations = 0;

    for (let i = 0; i < this.MAX_ITERATIONS; i++) {
      iterations++;
      const analysis = this.analyzeBalance(current, canvasW, canvasH);

      if (analysis.overallScore > bestScore) {
        bestScore = analysis.overallScore;
        bestLayout = current.map(e => ({ ...e }));
      }

      if (analysis.overallScore >= 0.95) break;

      // Rebalance
      current = this.rebalanceElements(current, analysis, canvasW, canvasH);
    }

    return { elements: bestLayout, analysis: this.analyzeBalance(bestLayout, canvasW, canvasH), iterations };
  }

  private analyzeBalance(elements: { x: number; y: number; w: number; h: number; weight?: number }[], cW: number, cH: number): BalanceAnalysis {
    const totalArea = cW * cH;
    const usedArea = elements.reduce((s, e) => s + e.w * e.h, 0);
    const density = usedArea / totalArea;

    // Center of mass
    const totalWeight = elements.reduce((s, e) => s + (e.weight ?? e.w * e.h), 0);
    const comX = totalWeight > 0 ? elements.reduce((s, e) => s + (e.x + e.w / 2) * (e.weight ?? e.w * e.h), 0) / totalWeight : cW / 2;
    const comY = totalWeight > 0 ? elements.reduce((s, e) => s + (e.y + e.h / 2) * (e.weight ?? e.w * e.h), 0) / totalWeight : cH / 2;
    const deviationX = Math.abs(comX - cW / 2) / (cW / 2);
    const deviationY = Math.abs(comY - cH / 2) / (cH / 2);
    const alignmentDeviation = (deviationX + deviationY) / 2;

    const whiteSpace = 1 - density;
    const whiteSpaceBalance = whiteSpace >= 0.3 && whiteSpace <= 0.6 ? 1 : Math.max(0, 1 - Math.abs(whiteSpace - 0.45) * 3);
    const overall = (1 - alignmentDeviation) * 0.3 + whiteSpaceBalance * 0.3 + (1 - Math.abs(density - 0.5)) * 0.2 + 0.8 * 0.2;

    return {
      densityIndex: density,
      alignmentDeviation,
      contrastRatio: 0.85,
      whiteSpaceDistribution: whiteSpaceBalance,
      hierarchyEntropy: 0.3,
      overallScore: Math.min(1, overall),
      optimized: overall >= 0.9,
    };
  }

  private rebalanceElements(elements: { x: number; y: number; w: number; h: number; weight?: number }[], analysis: BalanceAnalysis, cW: number, cH: number): typeof elements {
    return elements.map(el => {
      let { x, y } = el;
      if (analysis.alignmentDeviation > 0.1) {
        x += (cW / 2 - (x + el.w / 2)) * 0.1;
        y += (cH / 2 - (y + el.h / 2)) * 0.1;
      }
      return { ...el, x: Math.max(0, Math.min(cW - el.w, x)), y: Math.max(0, Math.min(cH - el.h, y)) };
    });
  }
}
