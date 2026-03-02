// Rasid v6.4 — Smart Pivot Reconstructor — Section 3.3
import { Injectable, Logger } from '@nestjs/common';

export interface PivotSuggestion {
  rows: string[]; columns: string[]; values: Array<{ field: string; aggregation: string }>;
  filters: string[]; confidence: number; timeGranularity?: string;
}

@Injectable()
export class PivotReconstructorEngine {
  private readonly logger = new Logger(PivotReconstructorEngine.name);

  suggestPivot(headers: string[], sampleRows: unknown[][]): PivotSuggestion {
    const fieldTypes = headers.map((h, i) => ({ name: h, index: i, type: this.inferType(sampleRows.map(r => r[i])) }));
    const dimensions = fieldTypes.filter(f => f.type === 'string' || f.type === 'date');
    const measures = fieldTypes.filter(f => f.type === 'number');
    const timeFields = fieldTypes.filter(f => f.type === 'date');

    const rows = dimensions.filter(d => d.type === 'string').slice(0, 2).map(d => d.name);
    const columns = timeFields.length > 0 ? [timeFields[0].name] : dimensions.slice(2, 3).map(d => d.name);
    const values = measures.slice(0, 3).map(m => ({ field: m.name, aggregation: this.suggestAggregation(m.name, sampleRows.map(r => r[m.index])) }));

    return {
      rows, columns, values, filters: dimensions.filter(d => !rows.includes(d.name) && !columns.includes(d.name)).map(d => d.name),
      confidence: Math.min(0.95, 0.5 + dimensions.length * 0.1 + measures.length * 0.1),
      timeGranularity: timeFields.length > 0 ? this.detectGranularity(sampleRows.map(r => r[timeFields[0].index])) : undefined,
    };
  }

  private inferType(values: unknown[]): 'string' | 'number' | 'date' {
    const nonNull = values.filter(v => v != null);
    if (nonNull.length === 0) return 'string';
    const numericCount = nonNull.reduce((c, v) => c + (!isNaN(Number(v)) ? 1 : 0), 0);
    if (numericCount / nonNull.length > 0.8) return 'number';
    const dateCount = nonNull.reduce((c, v) => c + (!isNaN(Date.parse(String(v))) ? 1 : 0), 0);
    if (dateCount / nonNull.length > 0.6) return 'date';
    return 'string';
  }

  private suggestAggregation(field: string, values: unknown[]): string {
    const lower = field.toLowerCase();
    if (lower.includes('count') || lower.includes('qty')) return 'SUM';
    if (lower.includes('rate') || lower.includes('ratio') || lower.includes('percentage')) return 'AVERAGE';
    if (lower.includes('max') || lower.includes('peak')) return 'MAX';
    if (lower.includes('min') || lower.includes('low')) return 'MIN';
    return 'SUM';
  }

  private detectGranularity(dateValues: unknown[]): string {
    const dates = dateValues.map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length < 2) return 'unknown';
    const diffs = [];
    for (let i = 1; i < dates.length; i++) diffs.push(dates[i].getTime() - dates[i - 1].getTime());
    const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    const days = avgDiff / (1000 * 60 * 60 * 24);
    if (days < 2) return 'daily';
    if (days < 10) return 'weekly';
    if (days < 45) return 'monthly';
    if (days < 120) return 'quarterly';
    return 'yearly';
  }

// GAP-23: Auto grouping suggestion
  suggestGrouping(data: unknown[], columns: string[]): Array<{ groupBy: string[]; aggregateBy: string[]; reason: string }> {
    const suggestions: Array<{ groupBy: string[]; aggregateBy: string[]; reason: string }> = [];
    const numericCols = columns.filter(c => data.some(r => typeof r[c] === 'number'));
    const categoryCols = columns.filter(c => {
      const unique = new Set(data.map(r => r[c]));
      return unique.size < data.length * 0.3 && unique.size >= 2;
    });
    const dateCols = columns.filter(c => data.some(r => !isNaN(Date.parse(String(r[c])))));

    if (categoryCols.length > 0 && numericCols.length > 0) {
      suggestions.push({ groupBy: [categoryCols[0]], aggregateBy: numericCols.slice(0, 3), reason: `Group by ${categoryCols[0]} (${new Set(data.map(r => r[categoryCols[0]])).size} unique values)` });
    }
    if (dateCols.length > 0 && numericCols.length > 0) {
      suggestions.push({ groupBy: [dateCols[0]], aggregateBy: numericCols.slice(0, 3), reason: `Time-series grouping by ${dateCols[0]}` });
    }
    if (categoryCols.length >= 2) {
      suggestions.push({ groupBy: categoryCols.slice(0, 2), aggregateBy: numericCols.slice(0, 2), reason: `Cross-tabulation: ${categoryCols[0]} × ${categoryCols[1]}` });
    }
    return suggestions;
  }
}
