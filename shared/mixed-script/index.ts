// Rasid v6.4 — Mixed-Script Stability Engine — Section 5.3
import { Injectable } from '@nestjs/common';

export interface MixedScriptResult {
  lines: ProcessedLine[]; baselineAligned: boolean;
  overlapDetected: boolean; totalCorrections: number;
}

export interface ProcessedLine {
  text: string; segments: Array<{ text: string; script: 'arabic' | 'latin' | 'numeric'; direction: 'rtl' | 'ltr' }>;
  dualBaseline: { arabic: number; latin: number }; corrected: boolean;
}

@Injectable()
export class MixedScriptEngine {
  process(lines: string[], baseFontSize: number = 16): MixedScriptResult {
    const processed: ProcessedLine[] = [];
    let overlapDetected = false, corrections = 0;

    for (const line of lines) {
      const segments = this.segmentLine(line);
      const hasArabic = segments.some(s => s.script === 'arabic');
      const hasLatin = segments.some(s => s.script === 'latin');

      const dualBaseline = {
        arabic: hasArabic ? baseFontSize * 0.85 : 0,
        latin: hasLatin ? baseFontSize * 0.75 : 0,
      };

      let corrected = false;
      if (hasArabic && hasLatin) {
        const baselineDiff = Math.abs(dualBaseline.arabic - dualBaseline.latin);
        if (baselineDiff > baseFontSize * 0.15) {
          dualBaseline.latin = dualBaseline.arabic - baseFontSize * 0.08;
          corrected = true;
          corrections++;
        }
      }

      processed.push({ text: line, segments, dualBaseline, corrected });
    }

    return { lines: processed, baselineAligned: corrections > 0, overlapDetected, totalCorrections: corrections };
  }

  private segmentLine(line: string): ProcessedLine['segments'] {
    const segments: ProcessedLine['segments'] = [];
    let current = '', currentScript: 'arabic' | 'latin' | 'numeric' = 'latin';

    for (const char of line) {
      const script = this.detectScript(char);
      if (script !== currentScript && current.length > 0) {
        segments.push({ text: current, script: currentScript, direction: currentScript === 'arabic' ? 'rtl' : 'ltr' });
        current = '';
      }
      currentScript = script;
      current += char;
    }
    if (current.length > 0) segments.push({ text: current, script: currentScript, direction: currentScript === 'arabic' ? 'rtl' : 'ltr' });
    return segments;
  }

  private detectScript(char: string): 'arabic' | 'latin' | 'numeric' {
    const code = char.charCodeAt(0);
    if ((code >= 0x0600 && code <= 0x06FF) || (code >= 0x0750 && code <= 0x077F) || (code >= 0x08A0 && code <= 0x08FF)) return 'arabic';
    if (code >= 0x30 && code <= 0x39) return 'numeric';
    return 'latin';
  }
}
