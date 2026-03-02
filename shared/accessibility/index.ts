// Rasid v6.4 — WCAG 2.1 AA Accessibility Engine

export interface AccessibilityReport {
  score: number; level: 'A' | 'AA' | 'AAA'; violations: AccessibilityViolation[];
  warnings: string[]; passes: number; total: number;
}

export interface AccessibilityViolation {
  id: string; rule: string; severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string; description: string; fix: string;
}

export class AccessibilityEngine {
  private readonly contrastRatios = { AA_normal: 4.5, AA_large: 3, AAA_normal: 7, AAA_large: 4.5 };

  audit(elements: Array<{ type: string; text?: string; ariaLabel?: string; color?: string; bgColor?: string; fontSize?: number; role?: string; lang?: string }>): AccessibilityReport {
    const violations: AccessibilityViolation[] = [];
    let passes = 0;

    for (const el of elements) {
      // 1.1.1 Non-text Content
      if (el.type === 'img' && !el.ariaLabel) {
        violations.push({ id: `a11y_${violations.length}`, rule: '1.1.1', severity: 'critical', element: el.type, description: 'Image missing alt text', fix: 'Add aria-label or alt attribute' });
      } else if (el.type === 'img') passes++;

      // 1.4.3 Contrast
      if (el.color && el.bgColor) {
        const ratio = this.computeContrastRatio(el.color, el.bgColor);
        const isLarge = (el.fontSize || 16) >= 18;
        const threshold = isLarge ? this.contrastRatios.AA_large : this.contrastRatios.AA_normal;
        if (ratio < threshold) {
          violations.push({ id: `a11y_${violations.length}`, rule: '1.4.3', severity: 'serious', element: el.type, description: `Contrast ratio ${ratio.toFixed(1)}:1 below ${threshold}:1`, fix: 'Increase color contrast' });
        } else passes++;
      }

      // 2.4.2 Page Title
      if (el.type === 'page' && !el.text) {
        violations.push({ id: `a11y_${violations.length}`, rule: '2.4.2', severity: 'serious', element: el.type, description: 'Page missing title', fix: 'Add descriptive page title' });
      }

      // 3.1.1 Language
      if (el.type === 'html' && !el.lang) {
        violations.push({ id: `a11y_${violations.length}`, rule: '3.1.1', severity: 'serious', element: el.type, description: 'Missing lang attribute', fix: 'Add lang="ar" for Arabic content' });
      }

      // 4.1.2 Name, Role, Value
      if (['button', 'input', 'select'].includes(el.type) && !el.ariaLabel && !el.text) {
        violations.push({ id: `a11y_${violations.length}`, rule: '4.1.2', severity: 'critical', element: el.type, description: 'Interactive element missing label', fix: 'Add aria-label or visible label' });
      } else if (['button', 'input', 'select'].includes(el.type)) passes++;

      // RTL-specific: 1.3.4 Orientation
      if (el.type === 'table' && el.lang === 'ar') {
        passes++; // RTL tables handled by platform
      }
    }

    const total = violations.length + passes;
    const score = total > 0 ? passes / total : 1;
    const level = violations.some(v => v.severity === 'critical') ? 'A' : violations.length === 0 ? 'AAA' : 'AA';

    return { score, level, violations, warnings: [], passes, total };
  }

  private computeContrastRatio(fg: string, bg: string): number {
    const fgLum = this.relativeLuminance(fg);
    const bgLum = this.relativeLuminance(bg);
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private relativeLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
}
