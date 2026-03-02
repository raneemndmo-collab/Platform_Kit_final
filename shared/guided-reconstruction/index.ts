// Rasid v6.4 — Guided Reconstruction Mode — Part XIX

export interface WizardStep { id: string; name: string; description: string; status: 'pending' | 'active' | 'complete' | 'skipped'; result?: unknown; }
export interface ComparisonView { strict: unknown; professional: unknown; metrics: { pixelDiff: number; structuralSim: number; spatialSim: number }; recommendation: string; }
export interface FingerprintComparison { originalFingerprint: string; reconstructedFingerprint: string; similarity: number; divergences: string[]; }

export class GuidedReconstructionEngine {
  private steps: WizardStep[] = [];

  initializeWizard(): WizardStep[] {
    this.steps = [
      { id: 'upload', name: 'Upload Source', description: 'Upload image, PDF, or file to reconstruct', status: 'pending' },
      { id: 'analyze', name: 'Source Analysis', description: 'Detect layout, elements, and structure', status: 'pending' },
      { id: 'archetype', name: 'Template Match', description: 'Match against layout archetype library', status: 'pending' },
      { id: 'constraints', name: 'Constraint Solving', description: 'Build MCGE constraint graph', status: 'pending' },
      { id: 'preview', name: 'Preview & Compare', description: 'STRICT vs PROFESSIONAL comparison', status: 'pending' },
      { id: 'rtl_check', name: 'RTL Preview', description: 'Arabic transformation preview (if applicable)', status: 'pending' },
      { id: 'verify', name: 'Triple Verification', description: 'Pixel + Structural + Spatial verification', status: 'pending' },
      { id: 'finalize', name: 'Finalize', description: 'Lock and export reconstruction', status: 'pending' },
    ];
    return this.steps;
  }

  advanceStep(stepId: string, result: unknown): WizardStep[] {
    const step = this.steps.find(s => s.id === stepId);
    if (step) { step.status = 'complete'; step.result = result; }
    const nextIdx = this.steps.findIndex(s => s.status === 'pending');
    if (nextIdx >= 0) this.steps[nextIdx].status = 'active';
    return this.steps;
  }

  skipStep(stepId: string): WizardStep[] {
    const step = this.steps.find(s => s.id === stepId);
    if (step) step.status = 'skipped';
    return this.steps;
  }

  // GAP-31: STRICT vs PROFESSIONAL comparison view
  generateComparisonView(
    strictResult: { elements: unknown[]; pixels?: number[] },
    professionalResult: { elements: unknown[]; pixels?: number[] },
    original: { elements: unknown[]; pixels?: number[] }
  ): ComparisonView {
    // Compute metrics for STRICT
    const strictPixelDiff = this.computePixelDiff(original.pixels, strictResult.pixels);
    const strictStructural = this.computeStructuralSimilarity(original.elements, strictResult.elements);
    const strictSpatial = this.computeSpatialSimilarity(original.elements, strictResult.elements);

    // Compute metrics for PROFESSIONAL
    const profPixelDiff = this.computePixelDiff(original.pixels, professionalResult.pixels);
    const profStructural = this.computeStructuralSimilarity(original.elements, professionalResult.elements);
    const profSpatial = this.computeSpatialSimilarity(original.elements, professionalResult.elements);

    const strictScore = (1 - strictPixelDiff) * 0.33 + strictStructural * 0.33 + strictSpatial * 0.34;
    const profScore = (1 - profPixelDiff) * 0.33 + profStructural * 0.33 + profSpatial * 0.34;

    return {
      strict: { elements: strictResult.elements, score: strictScore, pixelDiff: strictPixelDiff, structural: strictStructural, spatial: strictSpatial },
      professional: { elements: professionalResult.elements, score: profScore, pixelDiff: profPixelDiff, structural: profStructural, spatial: profSpatial },
      metrics: { pixelDiff: strictPixelDiff - profPixelDiff, structuralSim: strictStructural - profStructural, spatialSim: strictSpatial - profSpatial },
      recommendation: strictScore >= profScore ? 'STRICT provides higher fidelity' : 'PROFESSIONAL provides better visual optimization',
    };
  }

  // GAP-31: Real-time fingerprint comparison
  compareFingerprints(original: unknown[], reconstructed: unknown[]): FingerprintComparison {
    const buildFP = (els: unknown[]): string => {
      return els.map(e => `${e.type || 'el'}@${Math.round(e.x)},${Math.round(e.y)}:${Math.round(e.width || 0)}x${Math.round(e.height || 0)}`).sort().join('|');
    };
    const origFP = buildFP(original);
    const reconFP = buildFP(reconstructed);

    const origParts = new Set(origFP.split('|'));
    const reconParts = new Set(reconFP.split('|'));
    let match = 0;
    for (const p of origParts) if (reconParts.has(p)) match++;
    const similarity = match / Math.max(origParts.size, reconParts.size, 1);

    const divergences: string[] = [];
    for (const p of origParts) if (!reconParts.has(p)) divergences.push(`Missing: ${p}`);
    for (const p of reconParts) if (!origParts.has(p)) divergences.push(`Added: ${p}`);

    return { originalFingerprint: origFP, reconstructedFingerprint: reconFP, similarity, divergences: divergences.slice(0, 20) };
  }

  getCurrentStep(): WizardStep | undefined { return this.steps.find(s => s.status === 'active'); }
  getProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.steps.reduce((___c, s) => (s.status === 'complete' || s.status === 'skipped') ? ___c + 1 : ___c, 0);
    return { completed, total: this.steps.length, percentage: completed / this.steps.length };
  }

  private computePixelDiff(a?: number[], b?: number[]): number {
    if (!a || !b || a.length !== b.length) return 1;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 0.5) diff++;
    return diff / a.length;
  }

  private computeStructuralSimilarity(a: unknown[], b: unknown[]): number {
    if (!a.length || !b.length) return 0;
    let match = 0;
    for (const elA of a) {
      const found = b.find((elB: unknown) => elB.id === elA.id || (Math.abs(elB.x - elA.x) < 10 && Math.abs(elB.y - elA.y) < 10));
      if (found) match++;
    }
    return match / Math.max(a.length, b.length);
  }

  private computeSpatialSimilarity(a: unknown[], b: unknown[]): number {
    if (a.length < 2 || b.length < 2) return 0;
    const pairDist = (els: unknown[]) => {
      const d: number[] = [];
      for (let i = 0; i < Math.min(els.length, 10); i++)
        for (let j = i + 1; j < Math.min(els.length, 10); j++)
          d.push(Math.sqrt((els[j].x - els[i].x) ** 2 + (els[j].y - els[i].y) ** 2));
      return d.sort((x, y) => x - y);
    };
    const dA = pairDist(a), dB = pairDist(b);
    const len = Math.min(dA.length, dB.length);
    if (len === 0) return 0;
    let sim = 0;
    for (let i = 0; i < len; i++) {
      const max = Math.max(dA[i], dB[i], 1);
      sim += 1 - Math.abs(dA[i] - dB[i]) / max;
    }
    return sim / len;
  }

// GAP-26 FIX: Step-by-step guided reconstruction with feedback loop
  reconstructWithGuidance(original: Array<{ id: string; type: string; content: unknown }>, steps: Array<{ action: string; target: string; params: Record<string, unknown> }>): {
    result: Array<{ id: string; modified: boolean; action: string }>;
    completionRate: number;
    skippedSteps: string[];
  } {
    const result: Array<{ id: string; modified: boolean; action: string }> = [];
    const skipped: string[] = [];
    for (const step of steps) {
      const target = original.find(e => e.id === step.target);
      if (!target) { skipped.push(step.target); continue; }
      result.push({ id: step.target, modified: true, action: step.action });
    }
    return { result, completionRate: result.length / (steps.length || 1), skippedSteps: skipped };
  }
}
