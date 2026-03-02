// Rasid v6.4 — Render Mode Validator — GAP-10 Fix
export type RenderMode = 'STRICT' | 'PROFESSIONAL' | 'FAST';

export interface ModeValidation {
  mode: RenderMode;
  valid: boolean;
  violations: string[];
  enforcements: string[];
}

export class RenderModeValidator {
  /**
   * GAP-10: Validate that output matches declared render mode constraints
   */
  validate(mode: RenderMode, output: {
    fidelity?: number;
    deterministicOrder?: boolean;
    layoutModified?: boolean;
    dataLoss?: boolean;
    renderTimeMs?: number;
  }): ModeValidation {
    const violations: string[] = [];
    const enforcements: string[] = [];

    switch (mode) {
      case 'STRICT':
        if (output.fidelity !== undefined && output.fidelity < 0.999) {
          violations.push(`Fidelity ${output.fidelity} below STRICT threshold 0.999`);
        }
        if (output.layoutModified === true) {
          violations.push('STRICT mode prohibits layout modifications');
        }
        if (output.dataLoss === true) {
          violations.push('STRICT mode prohibits data loss');
        }
        enforcements.push('pixel-perfect fidelity', 'no layout changes', 'no data loss');
        break;

      case 'PROFESSIONAL':
        if (output.fidelity !== undefined && output.fidelity < 0.95) {
          violations.push(`Fidelity ${output.fidelity} below PROFESSIONAL threshold 0.95`);
        }
        enforcements.push('high fidelity', 'cognitive optimization allowed');
        break;

      case 'FAST':
        if (output.renderTimeMs !== undefined && output.renderTimeMs > 5000) {
          violations.push(`Render time ${output.renderTimeMs}ms exceeds FAST mode limit 5000ms`);
        }
        enforcements.push('speed priority', 'approximate rendering allowed');
        break;
    }

    if (output.deterministicOrder === false) {
      violations.push('Non-deterministic output order detected');
    }

    return { mode, valid: violations.length === 0, violations, enforcements };
  }
}
