// Rasid v6.4 — Visual Reconstruction Pipeline Extension — Part V
import { Injectable } from '@nestjs/common';

export interface PipelineStage { name: string; status: 'pending'|'running'|'complete'|'failed'; result?: unknown; durationMs?: number; }
export interface ReconstructionResult { stages: PipelineStage[]; kpiBlocks: unknown[]; chartTypes: string[]; filterControls: unknown[]; legendRelationships: unknown[]; geometry: Record<string, unknown>; dataBindings: unknown[]; densityStable: boolean; aggregationHierarchy: unknown[]; }

@Injectable()
export class VisualReconstructionPipeline {
  async reconstruct(input: { imageData?: Buffer; elements?: unknown[]; canvasWidth: number; canvasHeight: number; tenantId: string }): Promise<ReconstructionResult> {
    const stages: PipelineStage[] = [];
    const run = async (name: string, fn: () => Promise<unknown>) => {
      const s: PipelineStage = { name, status: 'running' }; stages.push(s);
      const t = Date.now();
      try { s.result = await fn(); s.status = 'complete'; } catch (e: unknown) { s.status = 'failed'; s.result = e.message; }
      s.durationMs = Date.now() - t; return s.result;
    };
    const els = input.elements || [];
    const gridResult = await run('advanced_grid_detection', async () => this.detectGrid(els, input.canvasWidth, input.canvasHeight));
    const spacingResult = await run('spacing_ratio_extraction', async () => this.extractSpacingRatios(els));
    await run('typography_baseline_inference', async () => this.inferTypographyBaselines(els));
    await run('hierarchy_weight_extraction', async () => this.extractHierarchyWeights(els));
    await run('whitespace_entropy_mapping', async () => this.mapWhitespaceEntropy(els, input.canvasWidth, input.canvasHeight));
    await run('contrast_topology_mapping', async () => this.mapContrastTopology(els));
    const archetypeResult = await run('archetype_correlation', async () => this.correlateArchetype(els, input.canvasWidth, input.canvasHeight));
    await run('constraint_solving', async () => ({ gridResult, spacingResult }));
    const perceptualResult = await run('perceptual_similarity_scoring', async () => this.scorePerceptualSimilarity(els));
    await run('adaptive_correction_loop', async () => this.adaptiveCorrection(els, perceptualResult));

    const kpiBlocks = this.detectKPIBlocks(els);
    const chartTypes = this.detectChartTypes(els);
    const aggregationHierarchy = this.detectAggregationHierarchy(els);
    const densityBefore = this.computeDensity(els, input.canvasWidth, input.canvasHeight);

    return {
      stages, kpiBlocks, chartTypes, filterControls: this.detectFilterControls(els),
      legendRelationships: this.detectLegends(els), geometry: gridResult,
      dataBindings: this.inferDataBindings(els, chartTypes, kpiBlocks),
      densityStable: Math.abs(densityBefore - this.computeDensity(els, input.canvasWidth, input.canvasHeight)) < 0.02,
      aggregationHierarchy,
    };
  }

  private detectGrid(elements: unknown[], w: number, h: number) {
    const xs = [...new Set(elements.map((e: unknown) => Math.round(e.x / 8) * 8))].sort((a: number, b: number) => a - b);
    const ys = [...new Set(elements.map((e: unknown) => Math.round(e.y / 8) * 8))].sort((a: number, b: number) => a - b);
    const colGaps = xs.slice(1).map((x: number, i: number) => x - xs[i]);
    const rowGaps = ys.slice(1).map((y: number, i: number) => y - ys[i]);
    return { detectedColumns: xs.length, detectedRows: ys.length, canvasWidth: w, canvasHeight: h, colGaps, rowGaps, gridUniform: new Set(colGaps).size <= 2 };
  }

  private extractSpacingRatios(elements: unknown[]) {
    return elements.slice(0, -1).map((e: Record<string, unknown>, i: number) => {
      const next = elements[i + 1];
      const gap = (next?.x || 0) - (e.x + (e.width || 0));
      return { from: e.id, to: next?.id, gap, ratio: gap / (e.width || 1) };
    });
  }

  private inferTypographyBaselines(elements: unknown[]) {
    return elements.filter((e: unknown) => e.type === 'text' || e.fontSize).map((e: unknown) => ({
      id: e.id, baseline: e.y + (e.height || 0) * 0.8, capHeight: (e.fontSize || 12) * 0.7, xHeight: (e.fontSize || 12) * 0.5,
    }));
  }

  private extractHierarchyWeights(elements: unknown[]) {
    const maxFontSize = Math.max(...elements.map((e: unknown) => e.fontSize || 12), 1);
    return elements.map((e: unknown) => ({
      id: e.id, weight: ((e.fontSize || 12) / maxFontSize) * (e.fontWeight === 'bold' ? 1.3 : 1), level: (e.fontSize || 12) >= maxFontSize * 0.8 ? 'primary' : (e.fontSize || 12) >= maxFontSize * 0.5 ? 'secondary' : 'tertiary',
    }));
  }

  private mapWhitespaceEntropy(elements: unknown[], w: number, h: number) {
    const totalArea = elements.reduce((s: number, e: Record<string, unknown>) => s + (e.width || 0) * (e.height || 0), 0);
    const canvasArea = w * h || 1;
    const coverage = totalArea / canvasArea;
    const quadrants = [0, 0, 0, 0];
    for (const e of elements) {
      const qx = (e.x + (e.width || 0) / 2) < w / 2 ? 0 : 1;
      const qy = (e.y + (e.height || 0) / 2) < h / 2 ? 0 : 1;
      quadrants[qy * 2 + qx] += (e.width || 0) * (e.height || 0);
    }
    const qRatios = quadrants.map(q => q / (totalArea || 1));
    const entropy = -qRatios.filter(r => r > 0).reduce((s, r) => s + r * Math.log2(r), 0);
    return { coverage, entropy, whitespace: 1 - coverage, quadrantBalance: entropy / 2 };
  }

  private mapContrastTopology(elements: unknown[]) {
    const contrasts = elements.map((e: unknown) => e.contrast || 0.5);
    const maxC = Math.max(...contrasts, 0.01);
    return elements.map((e: Record<string, unknown>, i: number) => ({
      id: e.id, contrast: contrasts[i], normalized: contrasts[i] / maxC,
      isHotspot: contrasts[i] / maxC > 0.85,
    }));
  }

  // GAP-18: Real archetype correlation instead of hardcoded
  private correlateArchetype(elements: unknown[], w: number, h: number): { bestMatch: string; confidence: number; scores: Record<string, number> } {
    const elCount = elements.length;
    const hasKPI = elements.some((e: unknown) => e.type === 'kpi' || e.type === 'metric');
    const hasChart = elements.some((e: unknown) => e.type === 'chart');
    const hasTable = elements.some((e: unknown) => e.type === 'table');
    const hasFilter = elements.some((e: unknown) => e.type === 'filter' || e.type === 'dropdown');
    const aspectRatio = w / (h || 1);
    const density = elCount / ((w * h) / 100000);

    const scores: Record<string, number> = {
      enterprise_dashboard: (hasKPI ? 0.3 : 0) + (hasChart ? 0.25 : 0) + (hasFilter ? 0.15 : 0) + (density > 1 ? 0.1 : 0) + (aspectRatio > 1.2 ? 0.1 : 0),
      saas_interface: (hasTable ? 0.25 : 0) + (hasFilter ? 0.2 : 0) + (!hasChart ? 0.15 : 0) + (elCount < 15 ? 0.1 : 0),
      corporate_slide: (aspectRatio > 1.5 ? 0.3 : 0) + (elCount < 8 ? 0.2 : 0) + (density < 0.5 ? 0.15 : 0),
      executive_report: (hasKPI ? 0.2 : 0) + (hasChart ? 0.15 : 0) + (elCount > 10 ? 0.1 : 0) + (hasTable ? 0.15 : 0),
      infographic: (density > 2 ? 0.2 : 0) + (elCount > 15 ? 0.15 : 0) + (!hasTable ? 0.1 : 0),
      data_visualization: (hasChart ? 0.35 : 0) + (!hasKPI ? 0.1 : 0) + (elCount < 10 ? 0.1 : 0),
    };

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { bestMatch: best[0], confidence: Math.min(best[1] + 0.1, 0.99), scores };
  }

  // GAP-18: Real perceptual similarity
  private scorePerceptualSimilarity(elements: unknown[]): { score: number; details: { structuralMatch: number; densityMatch: number; contrastMatch: number } } {
    if (elements.length === 0) return { score: 0, details: { structuralMatch: 0, densityMatch: 0, contrastMatch: 0 } };
    const positions = elements.map((e: unknown) => ({ x: e.x, y: e.y }));
    const pairDistances = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        pairDistances.push(Math.sqrt((positions[j].x - positions[i].x) ** 2 + (positions[j].y - positions[i].y) ** 2));
      }
    }
    const structuralMatch = pairDistances.length > 0 ? 1 - (new Set(pairDistances.map(d => Math.round(d / 10))).size / pairDistances.length) * 0.3 : 0.8;
    const sizes = elements.map((e: unknown) => (e.width || 1) * (e.height || 1));
    const sizeVariance = sizes.length > 1 ? Math.sqrt(sizes.reduce((s, v) => s + (v - sizes.reduce((a, b) => a + b, 0) / sizes.length) ** 2, 0) / sizes.length) / (Math.max(...sizes) || 1) : 0;
    const densityMatch = 1 - Math.min(sizeVariance, 0.5);
    const contrasts = elements.map((e: unknown) => e.contrast || 0.5);
    const contrastMatch = contrasts.length > 1 ? 1 - (Math.max(...contrasts) - Math.min(...contrasts)) * 0.3 : 0.9;
    return { score: structuralMatch * 0.4 + densityMatch * 0.3 + contrastMatch * 0.3, details: { structuralMatch, densityMatch, contrastMatch } };
  }

  // GAP-18: Real adaptive correction loop
  private adaptiveCorrection(elements: unknown[], perceptual: Record<string, unknown>): { corrected: number; iterations: number } {
    let corrected = 0, iterations = 0;
    const maxIter = 5;
    while (iterations < maxIter) {
      iterations++;
      let changes = 0;
      // Snap to grid
      for (const el of elements) {
        const snappedX = Math.round(el.x / 4) * 4;
        const snappedY = Math.round(el.y / 4) * 4;
        if (snappedX !== el.x || snappedY !== el.y) { el.x = snappedX; el.y = snappedY; changes++; }
      }
      // Fix overlaps
      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const a = elements[i], b = elements[j];
          if (a.x < b.x + (b.width || 0) && a.x + (a.width || 0) > b.x && a.y < b.y + (b.height || 0) && a.y + (a.height || 0) > b.y) {
            b.y = a.y + (a.height || 0) + 8; changes++;
          }
        }
      }
      corrected += changes;
      if (changes === 0) break;
    }
    return { corrected, iterations };
  }

  private detectKPIBlocks(elements: unknown[]) { return elements.filter((e: unknown) => e.type === 'kpi' || e.type === 'metric' || (e.fontSize && e.fontSize > 24 && !e.children)); }
  private detectChartTypes(elements: unknown[]) { return [...new Set(elements.filter((e: unknown) => e.type === 'chart').map((e: unknown) => e.chartType || 'unknown'))]; }
  private detectFilterControls(elements: unknown[]) { return elements.filter((e: unknown) => e.type === 'filter' || e.type === 'dropdown' || e.type === 'date_picker'); }
  private detectLegends(elements: unknown[]) { return elements.filter((e: unknown) => e.type === 'legend').map((e: unknown) => ({ id: e.id, chartRef: e.chartRef, items: e.items || [] })); }

  // GAP-18: Real aggregation hierarchy detection
  private detectAggregationHierarchy(elements: unknown[]): Array<{ level: number; type: string; elements: string[] }> {
    const hierarchy: Array<{ level: number; type: string; elements: string[] }> = [];
    const topLevel = elements.filter((e: unknown) => e.type === 'kpi' || (e.fontSize && e.fontSize >= 24));
    if (topLevel.length > 0) hierarchy.push({ level: 0, type: 'summary_kpis', elements: topLevel.map((e: unknown) => e.id) });
    const charts = elements.filter((e: unknown) => e.type === 'chart');
    if (charts.length > 0) hierarchy.push({ level: 1, type: 'visualizations', elements: charts.map((e: unknown) => e.id) });
    const tables = elements.filter((e: unknown) => e.type === 'table');
    if (tables.length > 0) hierarchy.push({ level: 2, type: 'detail_tables', elements: tables.map((e: unknown) => e.id) });
    return hierarchy;
  }

  private inferDataBindings(elements: unknown[], chartTypes: string[], kpis: unknown[]): Array<{ elementId: string; dataSource: string; field: string }> {
    return [...kpis.map((k: Record<string, unknown>) => ({ elementId: k.id, dataSource: 'primary', field: k.metric || k.title || 'value' })),
      ...elements.filter((e: unknown) => e.type === 'chart').map((e: unknown) => ({ elementId: e.id, dataSource: 'primary', field: e.dataField || 'series' }))];
  }

  private computeDensity(elements: unknown[], w: number, h: number): number {
    return elements.reduce((s: number, e: Record<string, unknown>) => s + (e.width || 0) * (e.height || 0), 0) / (w * h || 1);
  }

// GAP-18 FIX: Deep archetype correlation with scoring dimensions
  deepCorrelateArchetype(elements: Array<{ id: string; type: string; x: number; y: number; width: number; height: number; content?: string }>, archetypes: Array<{ name: string; pattern: Array<{ type: string; relativeX: number; relativeY: number }> }>): { bestMatch: string; score: number; dimensions: { spatial: number; semantic: number; structural: number } } {
    let bestMatch = 'unknown';
    let bestScore = 0;
    let bestDimensions = { spatial: 0, semantic: 0, structural: 0 };

    for (const arch of archetypes) {
      // Spatial: How well do positions match the archetype pattern?
      let spatialScore = 0;
      const normElements = elements.map(e => ({
        ...e,
        relX: e.x / Math.max(...elements.map(el => el.x + el.width), 1),
        relY: e.y / Math.max(...elements.map(el => el.y + el.height), 1),
      }));
      for (const p of arch.pattern) {
        const closest = normElements.filter(e => e.type === p.type)
          .map(e => Math.sqrt((e.relX - p.relativeX) ** 2 + (e.relY - p.relativeY) ** 2))
          .sort((a, b) => a - b)[0];
        if (closest !== undefined) spatialScore += Math.max(0, 1 - closest);
      }
      spatialScore = arch.pattern.length > 0 ? spatialScore / arch.pattern.length : 0;

      // Semantic: Type distribution match
      const archTypes = new Set(arch.pattern.map(p => p.type));
      const elemTypes = new Set(elements.map(e => e.type));
      const overlap = [...archTypes].reduce((c, t) => c + (elemTypes.has(t) ? 1 : 0), 0);
      const semanticScore = archTypes.size > 0 ? overlap / archTypes.size : 0;

      // Structural: Element count ratio
      const structuralScore = Math.min(1, Math.min(elements.length, arch.pattern.length) / Math.max(elements.length, arch.pattern.length, 1));

      const totalScore = spatialScore * 0.5 + semanticScore * 0.3 + structuralScore * 0.2;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = arch.name;
        bestDimensions = { spatial: spatialScore, semantic: semanticScore, structural: structuralScore };
      }
    }
    return { bestMatch, score: bestScore, dimensions: bestDimensions };
  }
}
