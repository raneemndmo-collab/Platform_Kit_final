// Rasid v6.4 — Formula Inference Engine — Section 3.1
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger } from '@nestjs/common';

export interface FormulaInferenceResult {
  cellRef: string; inferredFormula: string; confidence: number;
  patternType: 'sum' | 'average' | 'percentage' | 'difference' | 'growth' | 'lookup' | 'custom';
  suggestedSimplification?: string; circularDependency: boolean;
}

@Injectable()
export class FormulaInferenceEngine {
  private readonly logger = new Logger(FormulaInferenceEngine.name);

  inferFromPattern(data: Array<{ cell: string; value: number; row: number; col: number }>): FormulaInferenceResult[] {
    const results: FormulaInferenceResult[] = [];
    const grid = new BoundedMap<string, number>(10_000);
    for (const d of data) grid.set(`${d.row}:${d.col}`, d.value);

    for (const d of data) {
      const rowValues = data.filter(x => x.row === d.row && x.col !== d.col).map(x => x.value);
      const colValues = data.filter(x => x.col === d.col && x.row !== d.row).map(x => x.value);

      if (rowValues.length >= 2) {
        const sum = rowValues.reduce((s, v) => s + v, 0);
        if (Math.abs(d.value - sum) < 0.01) {
          results.push({ cellRef: d.cell, inferredFormula: `SUM(row_${d.row})`, confidence: 0.95, patternType: 'sum', circularDependency: false });
          continue;
        }
        const avg = sum / rowValues.length;
        if (Math.abs(d.value - avg) < 0.01) {
          results.push({ cellRef: d.cell, inferredFormula: `AVERAGE(row_${d.row})`, confidence: 0.90, patternType: 'average', circularDependency: false });
          continue;
        }
      }
      if (colValues.length >= 2) {
        const sum = colValues.reduce((s, v) => s + v, 0);
        if (Math.abs(d.value - sum) < 0.01) {
          results.push({ cellRef: d.cell, inferredFormula: `SUM(col_${d.col})`, confidence: 0.93, patternType: 'sum', circularDependency: false });
        }
      }
    }
    return results;
  }

  detectCircularDependencies(formulas: Array<{ cell: string; references: string[] }>): string[][] {
    const graph = new BoundedMap<string, string[]>(10_000);
    for (const f of formulas) graph.set(f.cell, f.references);
    const cycles: string[][] = [];
    const visited = new Set<string>(), recStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node); recStack.add(node); path.push(node);
      for (const neighbor of (graph.get(node) || [])) {
        if (recStack.has(neighbor)) { cycles.push([...path.slice(path.indexOf(neighbor)), neighbor]); }
        else if (!visited.has(neighbor)) { dfs(neighbor, path); }
      }
      path.pop(); recStack.delete(node);
    };

    for (const cell of graph.keys()) { if (!visited.has(cell)) dfs(cell, []); }
    return cycles;
  }


// GAP-11: Detect logical errors in formulas
  detectLogicalErrors(formulas: Array<{ cell: string; formula: string; result: unknown }>): Array<{ cell: string; error: string; severity: 'warning' | 'error' }> {
    const errors: Array<{ cell: string; error: string; severity: 'warning' | 'error' }> = [];
    for (const f of formulas) {
      // Division by zero risk
      if (/\/\s*0/.test(f.formula) || (typeof f.result === 'number' && !isFinite(f.result))) {
        errors.push({ cell: f.cell, error: 'Division by zero or infinite result', severity: 'error' });
      }
      // Hardcoded values in formulas (anti-pattern)
      if (/[=+\-*/]\s*\d{4,}/.test(f.formula) && !/[A-Z]+\d+/.test(f.formula)) {
        errors.push({ cell: f.cell, error: 'Hardcoded large number in formula — consider using cell reference', severity: 'warning' });
      }
      // Inconsistent range patterns
      if (/SUM\([A-Z]+\d+\)/.test(f.formula) && !/SUM\([A-Z]+\d+:[A-Z]+\d+\)/.test(f.formula)) {
        errors.push({ cell: f.cell, error: 'SUM with single cell — likely incomplete range', severity: 'warning' });
      }
      // Nested IF overload
      const ifCount = (f.formula.match(/IF\(/gi) || []).length;
      if (ifCount > 3) {
        errors.push({ cell: f.cell, error: `Deeply nested IF (${ifCount} levels) — consider SWITCH or lookup table`, severity: 'warning' });
      }
      // Result type mismatch
      if (typeof f.result === 'string' && /SUM|AVERAGE|COUNT/.test(f.formula)) {
        errors.push({ cell: f.cell, error: 'Aggregation formula returning text — possible type mismatch', severity: 'error' });
      }
    }
    return errors;
  }

  // GAP-11: Suggest formula simplification
  suggestSimplification(formula: string): { simplified: string; explanation: string } | null {
    // Repeated cell references
    const refs = formula.match(/[A-Z]+\d+/g) || [];
    const refCounts = new BoundedMap<string, number>(10_000);
    for (const r of refs) refCounts.set(r, (refCounts.get(r) || 0) + 1);
    const duplicated = [...refCounts.entries()].filter(([_, c]) => c > 2);
    if (duplicated.length > 0) {
      return { simplified: `Consider using named range for ${duplicated.map(d => d[0]).join(', ')}`, explanation: `Cell ${duplicated[0][0]} referenced ${duplicated[0][1]} times` };
    }
    // Long SUM chains → range
    const sumMatch = formula.match(/SUM\(([A-Z]+)(\d+),\s*\1(\d+),\s*\1(\d+)/);
    if (sumMatch) {
      const col = sumMatch[1];
      const rows = [parseInt(sumMatch[2]), parseInt(sumMatch[3]), parseInt(sumMatch[4])].sort((a, b) => a - b);
      return { simplified: `SUM(${col}${rows[0]}:${col}${rows[rows.length - 1]})`, explanation: 'Consecutive cell references can be expressed as a range' };
    }
    return null;
  }
}
