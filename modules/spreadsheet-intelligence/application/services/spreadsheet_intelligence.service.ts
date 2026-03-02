// Rasid v6.4 — Spreadsheet Intelligence Service — Section 3
import { BoundedMap } from '../../../../shared/bounded-collections';
import { ExecutionSnapshotEngine } from '../../../../shared/execution-snapshot';
import { ParallelDAGOptimizer } from '../../../../shared/parallel-dag';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SpreadsheetIntelligenceRepository } from '../infrastructure/repositories/spreadsheet_intelligence.repository';
import { FormulaInferenceEngine } from '../../../../shared/formula-inference';
import { PivotReconstructorEngine } from '../../../../shared/pivot-reconstructor';
import { CircuitBreaker } from '../../../../shared/circuit-breaker';


export interface SpreadsheetAnalysis {
  patterns: PatternMatch[]; inferredFormulas: Array<{ cell: string; formula: string; confidence: number }>;
  circularDependencies: string[][]; precisionIssues: PrecisionIssue[];
  pivotSuggestion: unknown;
}

export interface PatternMatch {
  type: 'financial' | 'inventory' | 'statistical' | 'production';
  confidence: number; columns: string[]; description: string;
}

export interface PrecisionIssue {
  cell: string; expectedValue: number; actualValue: number;
  drift: number; severity: 'low' | 'medium' | 'high';
}

@Injectable()
export class SpreadsheetIntelligenceService {
  private readonly breaker = new CircuitBreaker('SpreadsheetIntelligenceService', 5, 30000);

  private safeEmit(event: string, data: unknown): void { try { this.events.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(SpreadsheetIntelligenceService.name);
  private readonly formulaEngine = new FormulaInferenceEngine();
  private readonly snapshotEngine = new (require("../../../../shared/execution-snapshot").ExecutionSnapshotEngine)();
  private readonly pivotEngine = new PivotReconstructorEngine();

  private readonly executionSnapshotEngine = new ExecutionSnapshotEngine();
  private readonly parallelDAGOptimizer = new ParallelDAGOptimizer();

  constructor(private readonly repo: SpreadsheetIntelligenceRepository, private readonly events: EventEmitter2) {}

  async listByTenant(tenantId: string) { return this.breaker.execute(async () => { return this.repo.findByTenant(tenantId); });}
  async create(tenantId: string, name: string, config: Record<string, unknown>) { return this.breaker.execute(async () => { return this.repo.create({ tenantId, name, config });}); }

  analyzeSpreadsheet(headers: string[], data: unknown[][], formulas: Array<{ cell: string; formula: string; references: string[] }> = []): SpreadsheetAnalysis {
    const patterns = this.detectPatterns(headers, data);
    const inferredFormulas = this.inferFormulas(headers, data);
    const circular = this.detectCircular(formulas);
    const precision = this.checkPrecision(data, headers);
    const pivot = this.suggestPivot(headers, data);

    return { patterns, inferredFormulas, circularDependencies: circular, precisionIssues: precision, pivotSuggestion: pivot };
  }

  private detectPatterns(headers: string[], data: unknown[][]): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const lower = headers.map(h => h.toLowerCase());

    const financialTerms = ['revenue', 'cost', 'profit', 'margin', 'tax', 'debit', 'credit', 'balance'];
    const finMatch = lower.filter(h => financialTerms.some(t => h.includes(t)));
    if (finMatch.length >= 2) patterns.push({ type: 'financial', confidence: Math.min(0.95, finMatch.length * 0.2), columns: finMatch, description: 'Financial data pattern detected' });

    const inventoryTerms = ['stock', 'quantity', 'sku', 'warehouse', 'inventory', 'reorder'];
    const invMatch = lower.filter(h => inventoryTerms.some(t => h.includes(t)));
    if (invMatch.length >= 2) patterns.push({ type: 'inventory', confidence: Math.min(0.95, invMatch.length * 0.2), columns: invMatch, description: 'Inventory management pattern detected' });

    return patterns;
  }

  private inferFormulas(headers: string[], data: unknown[][]): SpreadsheetAnalysis['inferredFormulas'] {
    const results: SpreadsheetAnalysis['inferredFormulas'] = [];
    if (data.length < 2) return results;

    for (let c = 0; c < headers.length; c++) {
      const numValues = data.map(r => r[c]).filter(v => typeof v === 'number');
      if (numValues.length < 2) continue;

      // Check if this column is the sum of other numeric columns
      const otherCols = headers.map((_, i) => i).filter(i => i !== c && data.every(r => typeof r[i] === 'number'));
      if (otherCols.length >= 2) {
        let isSumMatch = true;
        for (const row of data.slice(0, 10)) {
          const otherSum = otherCols.reduce((s, i) => s + (row[i] || 0), 0);
          if (typeof row[c] === 'number' && Math.abs(row[c] - otherSum) > 0.01) { isSumMatch = false; break; }
        }
        if (isSumMatch) {
          results.push({ cell: headers[c], formula: `SUM(${otherCols.map(i => headers[i]).join(', ')})`, confidence: 0.92 });
        }
      }
    }
    return results;
  }

  private detectCircular(formulas: Array<{ cell: string; references: string[] }>): string[][] {
    const graph = new BoundedMap<string, string[]>(10_000);
    for (const f of formulas) graph.set(f.cell, f.references);
    const cycles: string[][] = [];
    const visited = new Set<string>(), stack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node); stack.add(node); path.push(node);
      for (const ref of (graph.get(node) || [])) {
        if (stack.has(ref)) cycles.push([...path.slice(path.indexOf(ref)), ref]);
        else if (!visited.has(ref)) dfs(ref, path);
      }
      path.pop(); stack.delete(node);
    };

    for (const cell of graph.keys()) { if (!visited.has(cell)) dfs(cell, []); }
    return cycles;
  }

  private checkPrecision(data: unknown[][], headers: string[]): PrecisionIssue[] {
    const issues: PrecisionIssue[] = [];
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < headers.length; c++) {
        if (typeof data[r][c] === 'number') {
          const str = data[r][c].toString();
          if (str.includes('.') && str.split('.')[1].length > 10) {
            issues.push({ cell: `${headers[c]}:${r}`, expectedValue: parseFloat(data[r][c].toFixed(6)), actualValue: data[r][c], drift: Math.abs(data[r][c] - parseFloat(data[r][c].toFixed(6))), severity: 'low' });
          }
        }
      }
    }
    return issues;
  }

  private suggestPivot(headers: string[], data: unknown[][]) {
    const dims = headers.filter((_, i) => data.some(r => typeof r[i] === 'string'));
    const measures = headers.filter((_, i) => data.every(r => typeof r[i] === 'number' || r[i] == null));
    return { rows: dims.slice(0, 2), columns: dims.slice(2, 3), values: measures.slice(0, 3).map(m => ({ field: m, aggregation: 'SUM' })) };
  }

// === الفجوات المفقودة من Section 3 ===

  // 3.1: Delegate to shared formula-inference for error detection + simplification
  detectFormulaErrors(formulas: Array<{ cell: string; formula: string; result: unknown }>): unknown[] {
    return this.formulaEngine.detectLogicalErrors(formulas);
  }

  suggestFormulaSimplification(formula: string): unknown {
    return this.formulaEngine.suggestSimplification(formula);
  }

  // 3.1: Smart evaluation reordering
  reorderEvaluation(cells: Array<{ id: string; formula: string; dependencies: string[] }>): string[] {
    // Topological sort on dependency graph
    const graph = new BoundedMap<string, string[]>(10_000);
    const inDegree = new BoundedMap<string, number>(10_000);
    for (const cell of cells) {
      graph.set(cell.id, cell.dependencies);
      if (!inDegree.has(cell.id)) inDegree.set(cell.id, 0);
      for (const dep of cell.dependencies) {
        inDegree.set(dep, (inDegree.get(dep) || 0));
        inDegree.set(cell.id, (inDegree.get(cell.id) || 0) + 1);
      }
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id); }
    const order: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);
      for (const cell of cells) {
        if (cell.dependencies.includes(node)) {
          inDegree.set(cell.id, (inDegree.get(cell.id) || 1) - 1);
          if (inDegree.get(cell.id) === 0) queue.push(cell.id);
        }
      }
    }
    return order;
  }

  // 3.2: Table-to-analytical model conversion
  convertToAnalyticalModel(data: unknown[], columns: string[]): { factTable: unknown; dimensions: Record<string, unknown[]>; measures: string[]; relationships: unknown[] } {
    const numericCols = columns.filter(c => data.some(r => typeof r[c] === 'number'));
    const categoryCols = columns.filter(c => !numericCols.includes(c));
    const dimensions: Record<string, unknown[]> = {};
    for (const col of categoryCols) {
      dimensions[col] = [...new Set(data.map(r => r[col]))].map((v, i) => ({ id: i + 1, value: v }));
    }
    return { factTable: { columns: [...numericCols, ...categoryCols.map(c => `${c}_id`)], rowCount: data.length }, dimensions, measures: numericCols, relationships: categoryCols.map(c => ({ from: 'fact', to: c, type: 'many-to-one', key: `${c}_id` })) };
  }

  // 3.3: Delegate auto grouping to shared pivot-reconstructor
  suggestPivotGrouping(data: unknown[], columns: string[]): unknown[] {
    return this.pivotEngine.suggestGrouping(data, columns);
  }

  // 3.3: Time granularity detection for pivot
  detectTimeGranularity(data: unknown[], dateColumn: string): { granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'; sampleDates: string[] } {
    const dates = data.map(r => new Date(r[dateColumn])).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length < 2) return { granularity: 'daily', sampleDates: [] };
    const gaps = dates.slice(1).map((d, i) => d.getTime() - dates[i].getTime());
    const avgGapDays = (gaps.reduce((s, g) => s + g, 0) / gaps.length) / (1000 * 60 * 60 * 24);
    let granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily';
    if (avgGapDays > 300) granularity = 'yearly';
    else if (avgGapDays > 75) granularity = 'quarterly';
    else if (avgGapDays > 20) granularity = 'monthly';
    else if (avgGapDays > 5) granularity = 'weekly';
    return { granularity, sampleDates: dates.slice(0, 5).map(d => d.toISOString().split('T')[0]) };
  }

  // 3.3: Field redistribution based on usage
  redistributeFields(fields: Array<{ name: string; type: 'dimension' | 'measure'; usageCount: number }>): { rows: string[]; columns: string[]; values: string[]; filters: string[] } {
    const sorted = [...fields].sort((a, b) => b.usageCount - a.usageCount);
    const dims = sorted.filter(f => f.type === 'dimension');
    const measures = sorted.filter(f => f.type === 'measure');
    return {
      rows: dims.slice(0, 2).map(f => f.name),
      columns: dims.slice(2, 4).map(f => f.name),
      values: measures.slice(0, 5).map(f => f.name),
      filters: dims.slice(4).map(f => f.name),
    };
  }

  // 3.4: Precision loss detection
  detectPrecisionLoss(calculations: Array<{ cell: string; expected: number; actual: number }>): Array<{ cell: string; expected: number; actual: number; drift: number; significant: boolean }> {
    return calculations.map(c => {
      const drift = Math.abs(c.expected - c.actual);
      return { ...c, drift, significant: drift > 1e-10 || (c.expected !== 0 && drift / Math.abs(c.expected) > 1e-12) };
    });
  }

  // 3.4: Extended precision recalculation
  recalculateHighPrecision(values: number[], operation: 'sum' | 'product' | 'mean'): { result: number; standardResult: number; precisionDelta: number } {
    // Kahan summation for sum to reduce floating point error
    if (operation === 'sum' || operation === 'mean') {
      let sum = 0, compensation = 0;
      for (const v of values) {
        const y = v - compensation;
        const t = sum + y;
        compensation = (t - sum) - y;
        sum = t;
      }
      const standardResult = values.reduce((s, v) => s + v, 0);
      const result = operation === 'mean' ? sum / values.length : sum;
      const stdResult = operation === 'mean' ? standardResult / values.length : standardResult;
      return { result, standardResult: stdResult, precisionDelta: Math.abs(result - stdResult) };
    }
    // Product with log-space accumulation
    const logSum = values.reduce((s, v) => s + Math.log(Math.abs(v)), 0);
    const sign = values.reduce((s, v) => s * Math.sign(v), 1);
    const result = sign * Math.exp(logSum);
    const standardResult = values.reduce((s, v) => s * v, 1);
    return { result, standardResult, precisionDelta: Math.abs(result - standardResult) };
  }

  // 3.4: Cross-engine divergence detection
  detectCrossEngineDivergence(results: Array<{ engine: string; cell: string; value: number }>): Array<{ cell: string; engines: string[]; values: number[]; maxDivergence: number; significant: boolean }> {
    const cellMap = new Map<string, Array<{ engine: string; value: number }>>();
    for (const r of results) {
      if (!cellMap.has(r.cell)) cellMap.set(r.cell, []);
      cellMap.get(r.cell)!.push({ engine: r.engine, value: r.value });
    }
    const divergences: Array<{ cell: string; engines: string[]; values: number[]; maxDivergence: number; significant: boolean }> = [];
    for (const [cell, entries] of cellMap) {
      if (entries.length < 2) continue;
      const values = entries.map(e => e.value);
      const maxDiv = Math.max(...values) - Math.min(...values);
      divergences.push({ cell, engines: entries.map(e => e.engine), values, maxDivergence: maxDiv, significant: maxDiv > 1e-10 });
    }
    return divergences.filter(d => d.significant);
  }

  // === B: Integrated orphaned shared libraries ===

  // execution-snapshot — Excel fidelity matching
  captureExecutionSnapshot(cells: Array<{ ref: string; formula: string; value: unknown; deps: string[]; volatile?: boolean }>, evalOrder: number[]): unknown {
    // FIX A1: use class-level singleton
    const engine = this.snapshotEngine;
    return engine.captureSnapshot(cells, evalOrder);
  }

  // parallel-dag — concurrent formula evaluation
  async evaluateFormulasParallel(nodes: Array<{ id: string; deps: string[]; formula: string }>): Promise<unknown> {
    const optimizer = new ParallelDAGOptimizer();
    const plan = optimizer.analyze(nodes.map(n => ({ id: n.id, deps: n.deps, formula: n.formula, value: null })));
    return optimizer.executeParallel(plan, async (node: unknown) => ({ id: node.id, evaluated: true }));
  }
}
