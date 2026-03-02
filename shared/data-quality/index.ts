// Rasid v6.4 — Automatic Data Quality Scoring — Section 7.1
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger } from '@nestjs/common';

export interface DataQualityReport {
  overallScore: number; totalRows: number; totalColumns: number;
  missingValues: QualityIssue; outliers: QualityIssue;
  duplicates: QualityIssue; inconsistentFormats: QualityIssue;
  columnScores: Map<string, number>;
}

export interface QualityIssue {
  count: number; percentage: number; affected: Array<{ column: string; row: number; value?: unknown }>;
}

@Injectable()
export class DataQualityScoringEngine {
  private readonly logger = new Logger(DataQualityScoringEngine.name);

  score(data: unknown[][], headers: string[]): DataQualityReport {
    const totalRows = data.length, totalColumns = headers.length;
    const missing = this.detectMissing(data, headers);
    const outliers = this.detectOutliers(data, headers);
    const duplicates = this.detectDuplicates(data);
    const inconsistent = this.detectInconsistentFormats(data, headers);

    const totalIssues = missing.count + outliers.count + duplicates.count + inconsistent.count;
    const totalCells = totalRows * totalColumns;
    const overallScore = totalCells > 0 ? Math.max(0, 1 - (totalIssues / totalCells)) : 0;

    const columnScores = new BoundedMap<string, number>(10_000);
    for (let c = 0; c < headers.length; c++) {
      const colData = data.map(r => r[c]);
      const colMissing = colData.reduce((___c, v) => (v == null || v === '') ? ___c + 1 : ___c, 0);
      columnScores.set(headers[c], Math.max(0, 1 - colMissing / Math.max(totalRows, 1)));
    }

    return { overallScore, totalRows, totalColumns, missingValues: missing, outliers, duplicates, inconsistentFormats: inconsistent, columnScores };
  }

  private detectMissing(data: unknown[][], headers: string[]): QualityIssue {
    const affected: QualityIssue['affected'] = [];
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < headers.length; c++) {
        if (data[r][c] == null || data[r][c] === '') affected.push({ column: headers[c], row: r });
      }
    }
    return { count: affected.length, percentage: data.length > 0 ? (affected.length / (data.length * headers.length)) * 100 : 0, affected: affected.slice(0, 100) };
  }

  private detectOutliers(data: unknown[][], headers: string[]): QualityIssue {
    const affected: QualityIssue['affected'] = [];
    for (let c = 0; c < headers.length; c++) {
      const nums = data.map(r => r[c]).filter(v => typeof v === 'number');
      if (nums.length < 5) continue;
      const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
      const std = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length);
      if (std === 0) continue;
      for (let r = 0; r < data.length; r++) {
        if (typeof data[r][c] === 'number' && Math.abs(data[r][c] - mean) / std > 3) {
          affected.push({ column: headers[c], row: r, value: data[r][c] });
        }
      }
    }
    return { count: affected.length, percentage: data.length > 0 ? (affected.length / (data.length * headers.length)) * 100 : 0, affected: affected.slice(0, 100) };
  }

  private detectDuplicates(data: unknown[][]): QualityIssue {
    const seen = new BoundedMap<string, number>(10_000);
    const affected: QualityIssue['affected'] = [];
    for (let r = 0; r < data.length; r++) {
      const key = JSON.stringify(data[r]);
      if (seen.has(key)) affected.push({ column: 'all', row: r });
      else seen.set(key, r);
    }
    return { count: affected.length, percentage: data.length > 0 ? (affected.length / data.length) * 100 : 0, affected: affected.slice(0, 100) };
  }

  private detectInconsistentFormats(data: unknown[][], headers: string[]): QualityIssue {
    const affected: QualityIssue['affected'] = [];
    for (let c = 0; c < headers.length; c++) {
      const types = data.map(r => typeof r[c]);
      const dominant = this.mode(types);
      for (let r = 0; r < data.length; r++) {
        if (data[r][c] != null && typeof data[r][c] !== dominant) affected.push({ column: headers[c], row: r, value: data[r][c] });
      }
    }
    return { count: affected.length, percentage: data.length > 0 ? (affected.length / (data.length * headers.length)) * 100 : 0, affected: affected.slice(0, 100) };
  }

  private mode(arr: string[]): string {
    const freq = new BoundedMap<string, number>(10_000);
    for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
    let max = 0, result = 'string';
    for (const [k, v] of freq) { if (v > max) { max = v; result = k; } }
    return result;
  }
}
