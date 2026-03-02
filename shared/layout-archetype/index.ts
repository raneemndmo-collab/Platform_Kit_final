// Rasid v6.4 — Layout Archetype Library (LAL) — Part III
import { Injectable } from '@nestjs/common';

export interface LayoutArchetype {
  id: string; name: string; category: ArchetypeCategory;
  gridSpec: { columns: number; rows: number; gutterX: number; gutterY: number };
  regions: ArchetypeRegion[]; aspectRatio: number; density: number;
}

export enum ArchetypeCategory {
  ENTERPRISE_DASHBOARD = 'enterprise_dashboard', SAAS_INTERFACE = 'saas_interface',
  CORPORATE_SLIDE = 'corporate_slide', EXECUTIVE_REPORT = 'executive_report',
  INFOGRAPHIC = 'infographic', DATA_VISUALIZATION = 'data_visualization',
  FORM_LAYOUT = 'form_layout', KANBAN_BOARD = 'kanban_board',
}

export interface ArchetypeRegion {
  name: string; role: string; gridArea: { colStart: number; colEnd: number; rowStart: number; rowEnd: number };
  expectedElements: string[]; weight: number;
}

export interface MatchResult { archetype: LayoutArchetype; score: number; regionMapping: Record<string, string[]>; variance: number; }

@Injectable()
export class LayoutArchetypeLibrary {
  private readonly archetypes: LayoutArchetype[] = [
    {
      id: 'arch-dashboard-01', name: 'Enterprise KPI Dashboard', category: ArchetypeCategory.ENTERPRISE_DASHBOARD,
      gridSpec: { columns: 12, rows: 8, gutterX: 16, gutterY: 16 },
      regions: [
        { name: 'header', role: 'navigation', gridArea: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 1 }, expectedElements: ['logo', 'nav', 'user_menu'], weight: 0.1 },
        { name: 'kpi_row', role: 'kpi_display', gridArea: { colStart: 1, colEnd: 12, rowStart: 2, rowEnd: 2 }, expectedElements: ['kpi_card', 'metric'], weight: 0.2 },
        { name: 'main_chart', role: 'primary_viz', gridArea: { colStart: 1, colEnd: 8, rowStart: 3, rowEnd: 6 }, expectedElements: ['chart', 'graph'], weight: 0.35 },
        { name: 'sidebar', role: 'secondary_info', gridArea: { colStart: 9, colEnd: 12, rowStart: 3, rowEnd: 6 }, expectedElements: ['list', 'table', 'filter'], weight: 0.15 },
        { name: 'footer_charts', role: 'secondary_viz', gridArea: { colStart: 1, colEnd: 12, rowStart: 7, rowEnd: 8 }, expectedElements: ['chart', 'table'], weight: 0.2 },
      ],
      aspectRatio: 16/9, density: 0.65,
    },
    {
      id: 'arch-slide-01', name: 'Corporate Title Slide', category: ArchetypeCategory.CORPORATE_SLIDE,
      gridSpec: { columns: 12, rows: 6, gutterX: 24, gutterY: 24 },
      regions: [
        { name: 'title', role: 'primary_text', gridArea: { colStart: 1, colEnd: 8, rowStart: 2, rowEnd: 3 }, expectedElements: ['heading'], weight: 0.4 },
        { name: 'subtitle', role: 'secondary_text', gridArea: { colStart: 1, colEnd: 8, rowStart: 4, rowEnd: 4 }, expectedElements: ['text'], weight: 0.2 },
        { name: 'visual', role: 'imagery', gridArea: { colStart: 9, colEnd: 12, rowStart: 1, rowEnd: 6 }, expectedElements: ['image', 'icon'], weight: 0.3 },
        { name: 'branding', role: 'brand', gridArea: { colStart: 1, colEnd: 4, rowStart: 6, rowEnd: 6 }, expectedElements: ['logo'], weight: 0.1 },
      ],
      aspectRatio: 16/9, density: 0.35,
    },
    {
      id: 'arch-report-01', name: 'Executive Report', category: ArchetypeCategory.EXECUTIVE_REPORT,
      gridSpec: { columns: 12, rows: 16, gutterX: 20, gutterY: 12 },
      regions: [
        { name: 'header', role: 'document_header', gridArea: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 2 }, expectedElements: ['title', 'date', 'logo'], weight: 0.1 },
        { name: 'executive_summary', role: 'summary', gridArea: { colStart: 1, colEnd: 12, rowStart: 3, rowEnd: 5 }, expectedElements: ['text', 'highlight'], weight: 0.25 },
        { name: 'data_section', role: 'analysis', gridArea: { colStart: 1, colEnd: 8, rowStart: 6, rowEnd: 12 }, expectedElements: ['chart', 'table', 'text'], weight: 0.35 },
        { name: 'side_notes', role: 'annotation', gridArea: { colStart: 9, colEnd: 12, rowStart: 6, rowEnd: 12 }, expectedElements: ['callout', 'note'], weight: 0.1 },
        { name: 'conclusion', role: 'conclusion', gridArea: { colStart: 1, colEnd: 12, rowStart: 13, rowEnd: 16 }, expectedElements: ['text', 'recommendation'], weight: 0.2 },
      ],
      aspectRatio: 210/297, density: 0.55,
    },
    {
      id: 'arch-infographic-01', name: 'Data Infographic', category: ArchetypeCategory.INFOGRAPHIC,
      gridSpec: { columns: 6, rows: 12, gutterX: 12, gutterY: 8 },
      regions: [
        { name: 'hero', role: 'title_visual', gridArea: { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 2 }, expectedElements: ['icon', 'title'], weight: 0.15 },
        { name: 'flow', role: 'narrative', gridArea: { colStart: 1, colEnd: 6, rowStart: 3, rowEnd: 10 }, expectedElements: ['icon', 'stat', 'chart', 'text'], weight: 0.7 },
        { name: 'footer', role: 'source', gridArea: { colStart: 1, colEnd: 6, rowStart: 11, rowEnd: 12 }, expectedElements: ['source', 'logo'], weight: 0.15 },
      ],
      aspectRatio: 1/2.5, density: 0.7,
    },
    {
      id: 'arch-dataviz-01', name: 'Data Visualization Panel', category: ArchetypeCategory.DATA_VISUALIZATION,
      gridSpec: { columns: 12, rows: 8, gutterX: 16, gutterY: 16 },
      regions: [
        { name: 'filters', role: 'controls', gridArea: { colStart: 1, colEnd: 12, rowStart: 1, rowEnd: 1 }, expectedElements: ['dropdown', 'datepicker', 'toggle'], weight: 0.1 },
        { name: 'primary', role: 'main_chart', gridArea: { colStart: 1, colEnd: 8, rowStart: 2, rowEnd: 6 }, expectedElements: ['chart'], weight: 0.45 },
        { name: 'legend', role: 'legend', gridArea: { colStart: 9, colEnd: 12, rowStart: 2, rowEnd: 4 }, expectedElements: ['legend', 'color_key'], weight: 0.1 },
        { name: 'detail', role: 'detail_table', gridArea: { colStart: 9, colEnd: 12, rowStart: 5, rowEnd: 6 }, expectedElements: ['table', 'metrics'], weight: 0.15 },
        { name: 'comparison', role: 'secondary_chart', gridArea: { colStart: 1, colEnd: 12, rowStart: 7, rowEnd: 8 }, expectedElements: ['chart', 'sparkline'], weight: 0.2 },
      ],
      aspectRatio: 16/9, density: 0.6,
    },
  ];

  matchLayout(elements: unknown[], canvasWidth: number, canvasHeight: number): MatchResult[] {
    const aspectRatio = canvasWidth / canvasHeight;
    return this.archetypes
      .map(arch => {
        const arScore = 1 - Math.min(1, Math.abs(arch.aspectRatio - aspectRatio) / arch.aspectRatio);
        const regionScore = this.scoreRegionMatch(arch, elements, canvasWidth, canvasHeight);
        const densityScore = this.scoreDensityMatch(arch, elements, canvasWidth, canvasHeight);
        const score = arScore * 0.2 + regionScore.score * 0.5 + densityScore * 0.3;
        return { archetype: arch, score, regionMapping: regionScore.mapping, variance: 1 - score };
      })
      .sort((a, b) => b.score - a.score);
  }

  getArchetype(category: ArchetypeCategory): LayoutArchetype | undefined {
    return this.archetypes.find(a => a.category === category);
  }

  listArchetypes(): LayoutArchetype[] { return [...this.archetypes]; }

  private scoreRegionMatch(arch: LayoutArchetype, elements: unknown[], cw: number, ch: number): { score: number; mapping: Record<string, string[]> } {
    const mapping: Record<string, string[]> = {};
    let totalScore = 0, totalWeight = 0;
    for (const region of arch.regions) {
      const rx = (region.gridArea.colStart - 1) / arch.gridSpec.columns * cw;
      const ry = (region.gridArea.rowStart - 1) / arch.gridSpec.rows * ch;
      const rw = (region.gridArea.colEnd - region.gridArea.colStart + 1) / arch.gridSpec.columns * cw;
      const rh = (region.gridArea.rowEnd - region.gridArea.rowStart + 1) / arch.gridSpec.rows * ch;
      const matched = elements.filter(e => e.x >= rx - 20 && e.x <= rx + rw + 20 && e.y >= ry - 20 && e.y <= ry + rh + 20);
      mapping[region.name] = matched.map(e => e.id || e.type);
      const coverage = Math.min(1, matched.length / Math.max(1, region.expectedElements.length));
      totalScore += coverage * region.weight;
      totalWeight += region.weight;
    }
    return { score: totalWeight > 0 ? totalScore / totalWeight : 0, mapping };
  }

  private scoreDensityMatch(arch: LayoutArchetype, elements: unknown[], cw: number, ch: number): number {
    const totalArea = elements.reduce((s, e) => s + (e.width || 0) * (e.height || 0), 0);
    const canvasArea = cw * ch || 1;
    const actualDensity = totalArea / canvasArea;
    return 1 - Math.min(1, Math.abs(arch.density - actualDensity));
  }

// GAP-25 FIX: Smart archetype selection based on content analysis
  selectBestArchetype(elements: Array<{ type: string; area: number }>, contentType: string): { archetype: string; confidence: number; alternatives: string[] } {
    const typeDistribution = new Map<string, number>();
    for (const el of elements) typeDistribution.set(el.type, (typeDistribution.get(el.type) || 0) + 1);
    const dominant = [...typeDistribution.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';
    const archetypeMap: Record<string, string[]> = {
      'text': ['article', 'report', 'letter'],
      'image': ['gallery', 'portfolio', 'magazine'],
      'table': ['spreadsheet', 'dashboard', 'report'],
      'chart': ['dashboard', 'analytics', 'report'],
      'mixed': ['magazine', 'presentation', 'infographic'],
    };
    const candidates = archetypeMap[dominant] || archetypeMap['mixed'];
    return { archetype: candidates[0], confidence: 0.85, alternatives: candidates.slice(1) };
  }
}
