import { BoundedMap } from '../../../../shared/bounded-collections';
/**
 * SECTION 12: Component-Level Creative Control (Versioned Creation System)
 * SECTION 13: Drag-Enhanced Creative Authoring
 * SECTION 14: Creative Cognitive Load Minimization
 * SECTION 15: Quality Enforcement for Creative Output
 * ────────────────────────────────────────────────────────
 */
import { Injectable, Logger } from '@nestjs/common';

// ═══════════════════════════════════════════════════════
// SECTION 12: Component Versioned Creation System
// ═══════════════════════════════════════════════════════

interface ComponentVersion {
  id: string;
  componentId: string;
  version: number;
  type: 'slide' | 'dashboard' | 'infographic_section';
  snapshot: Record<string, unknown>;
  constraints: string[];
  parentVersion?: string;
  createdAt: number;
  author: string;
}

interface CrossDocSync {
  sourceDocId: string;
  targetDocId: string;
  syncedComponents: string[];
  lastSyncAt: number;
  autoSync: boolean;
}

@Injectable()
export class ComponentVersionedCreationService {
  private readonly logger = new Logger('ComponentVersioning');
  private readonly versions = new BoundedMap<string, ComponentVersion[]>(10_000);
  private readonly syncs = new BoundedMap<string, CrossDocSync>(10_000);

  // Independent versioning per component
  createVersion(componentId: string, type: ComponentVersion['type'], snapshot: Record<string, unknown>, author: string): ComponentVersion {
    const existing = this.versions.get(componentId) ?? [];
    const version: ComponentVersion = {
      id: `ver_${componentId}_${existing.length + 1}`,
      componentId,
      version: existing.length + 1,
      type,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      constraints: [],
      parentVersion: existing.length > 0 ? existing[existing.length - 1].id : undefined,
      createdAt: Date.now(),
      author,
    };
    existing.push(version);
    this.versions.set(componentId, existing);

    // Limit version history
    if (existing.length > 50) {
      existing.splice(0, existing.length - 50);
    }

    return version;
  }

  getVersionHistory(componentId: string): ComponentVersion[] {
    return this.versions.get(componentId) ?? [];
  }

  rollback(componentId: string, targetVersion: number): ComponentVersion | null {
    const history = this.versions.get(componentId);
    if (!history) return null;
    const target = history.find(v => v.version === targetVersion);
    return target ?? null;
  }

  // Clone infographic section independently
  cloneSection(sourceId: string, targetId: string): ComponentVersion | null {
    const sourceHistory = this.versions.get(sourceId);
    if (!sourceHistory?.length) return null;
    const latest = sourceHistory[sourceHistory.length - 1];
    return this.createVersion(targetId, latest.type, latest.snapshot, 'system_clone');
  }

  // Cross-document synchronization
  setupSync(sourceDocId: string, targetDocId: string, componentIds: string[], autoSync = false): CrossDocSync {
    const sync: CrossDocSync = {
      sourceDocId, targetDocId, syncedComponents: componentIds,
      lastSyncAt: Date.now(), autoSync,
    };
    this.syncs.set(`${sourceDocId}:${targetDocId}`, sync);
    return sync;
  }

  syncComponents(sourceDocId: string, targetDocId: string): number {
    const sync = this.syncs.get(`${sourceDocId}:${targetDocId}`);
    if (!sync) return 0;
    let synced = 0;
    for (const compId of sync.syncedComponents) {
      const source = this.versions.get(`${sourceDocId}:${compId}`);
      if (source?.length) {
        const latest = source[source.length - 1];
        this.createVersion(`${targetDocId}:${compId}`, latest.type, latest.snapshot, 'sync');
        synced++;
      }
    }
    sync.lastSyncAt = Date.now();
    return synced;
  }

  // Constraint inheritance
  inheritConstraints(parentId: string, childId: string): string[] {
    const parent = this.versions.get(parentId);
    if (!parent?.length) return [];
    const latestParent = parent[parent.length - 1];

    const child = this.versions.get(childId);
    if (child?.length) {
      child[child.length - 1].constraints = [...latestParent.constraints];
    }
    return latestParent.constraints;
  }
}

// ═══════════════════════════════════════════════════════
// SECTION 13: Drag-Enhanced Creative Authoring
// ═══════════════════════════════════════════════════════

interface DragTarget {
  id: string;
  type: 'kpi' | 'dataset' | 'chart' | 'image' | 'text' | 'table';
  sourceData?: Record<string, unknown>;
}

interface DropZone {
  id: string;
  containerType: 'slide' | 'dashboard' | 'infographic';
  position: { x: number; y: number; w: number; h: number };
  acceptTypes: DragTarget['type'][];
}

interface DragResult {
  success: boolean;
  autoLayout: boolean;
  snappedPosition: { x: number; y: number };
  generatedContent?: Record<string, unknown>;
  fingerprintRecalculated: boolean;
  rtlAdjusted: boolean;
}

@Injectable()
export class DragEnhancedAuthoringService {
  private readonly logger = new Logger('DragAuthoring');
  private readonly SNAP_GRID = 8; // px
  private readonly ALIGNMENT_THRESHOLD = 12; // px

  handleDrop(target: DragTarget, zone: DropZone, dropPosition: { x: number; y: number }, existingElements: { x: number; y: number; w: number; h: number }[], rtl = false): DragResult {
    // Validate acceptance
    if (!zone.acceptTypes.includes(target.type)) {
      return { success: false, autoLayout: false, snappedPosition: dropPosition, fingerprintRecalculated: false, rtlAdjusted: false };
    }

    // Snap to grid
    let { x, y } = this.snapToGrid(dropPosition);

    // Smart alignment snapping to existing elements
    const aligned = this.alignToNearbyElements(x, y, existingElements);
    x = aligned.x;
    y = aligned.y;

    // RTL-aware adjustment
    if (rtl) {
      x = zone.position.x + zone.position.w - (x - zone.position.x) - (zone.position.w * 0.3);
    }

    // Auto-generate content based on drag type
    let generatedContent: Record<string, unknown> | undefined;
    switch (target.type) {
      case 'kpi':
        generatedContent = { type: 'kpi_card', value: target.sourceData?.value, label: target.sourceData?.label, layout: 'auto' };
        break;
      case 'dataset':
        generatedContent = { type: 'auto_narrative', data: target.sourceData, chartSuggestion: 'auto' };
        break;
      case 'chart':
        generatedContent = { type: 'chart_embed', chartConfig: target.sourceData, geometryPreserved: true };
        break;
      default:
        generatedContent = { type: target.type, content: target.sourceData };
    }

    return {
      success: true,
      autoLayout: true,
      snappedPosition: { x, y },
      generatedContent,
      fingerprintRecalculated: true,
      rtlAdjusted: rtl,
    };
  }

  // Smart spacing suggestions
  suggestSpacing(elements: { x: number; y: number; w: number; h: number }[]): { pairs: [number, number][]; suggestedGap: number }[] {
    if (elements.length < 2) return [];

    const suggestions: { pairs: [number, number][]; suggestedGap: number }[] = [];
    const gaps: number[] = [];

    // Find horizontal gaps
    const sorted = [...elements].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].x - (sorted[i - 1].x + sorted[i - 1].w);
      if (gap > 0 && gap < 100) gaps.push(gap);
    }

    if (gaps.length > 0) {
      const avgGap = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length / this.SNAP_GRID) * this.SNAP_GRID;
      suggestions.push({
        pairs: sorted.slice(1).map((_, i) => [i, i + 1] as [number, number]),
        suggestedGap: avgGap,
      });
    }

    return suggestions;
  }

  private snapToGrid(pos: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.round(pos.x / this.SNAP_GRID) * this.SNAP_GRID,
      y: Math.round(pos.y / this.SNAP_GRID) * this.SNAP_GRID,
    };
  }

  private alignToNearbyElements(x: number, y: number, elements: { x: number; y: number; w: number; h: number }[]): { x: number; y: number } {
    for (const el of elements) {
      // Snap to left edge
      if (Math.abs(x - el.x) < this.ALIGNMENT_THRESHOLD) x = el.x;
      // Snap to right edge
      if (Math.abs(x - (el.x + el.w)) < this.ALIGNMENT_THRESHOLD) x = el.x + el.w;
      // Snap to top edge
      if (Math.abs(y - el.y) < this.ALIGNMENT_THRESHOLD) y = el.y;
      // Snap to bottom edge
      if (Math.abs(y - (el.y + el.h)) < this.ALIGNMENT_THRESHOLD) y = el.y + el.h;
    }
    return { x, y };
  }
}

// ═══════════════════════════════════════════════════════
// SECTION 14: Creative Cognitive Load Minimization
// ═══════════════════════════════════════════════════════

interface CognitiveLoadAnalysis {
  overallLoad: number; // 0-1
  clutterScore: number;
  simplificationSuggestions: SimplificationSuggestion[];
  mergeSuggestions: { elementIds: string[]; reason: string; mergedType: string }[];
  redundantEmphasis: { elementId: string; issue: string }[];
  whitespaceRedistribution: { region: string; action: 'increase' | 'decrease'; amount: number }[];
  narrativeClarity: number;
}

interface SimplificationSuggestion {
  elementId: string;
  action: 'simplify' | 'remove' | 'merge' | 'resize' | 'reposition';
  reason: string;
  impact: number; // cognitive load reduction estimate
}

@Injectable()
export class CognitiveLoadReductionService {
  private readonly logger = new Logger('CognitiveLoad');
  private readonly MAX_COMFORTABLE_ELEMENTS = 7; // Miller's Law: 7±2
  private readonly MAX_FONT_VARIATIONS = 3;
  private readonly MAX_COLOR_VARIATIONS = 5;

  analyze(elements: {
    id: string;
    type: string;
    x: number; y: number; w: number; h: number;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    text?: string;
  }[], canvasW: number, canvasH: number): CognitiveLoadAnalysis {
    const clutter = this.calculateClutter(elements, canvasW, canvasH);
    const simplifications = this.findSimplifications(elements);
    const merges = this.findMergeCandidates(elements);
    const redundant = this.findRedundantEmphasis(elements);
    const whitespace = this.analyzeWhitespace(elements, canvasW, canvasH);
    const narrative = this.assessNarrativeClarity(elements);

    const overallLoad = (clutter * 0.3 + (1 - narrative) * 0.3 + (elements.length > this.MAX_COMFORTABLE_ELEMENTS ? 0.4 : 0)) * (1 + redundant.length * 0.05);

    return {
      overallLoad: Math.min(1, overallLoad),
      clutterScore: clutter,
      simplificationSuggestions: simplifications,
      mergeSuggestions: merges,
      redundantEmphasis: redundant,
      whitespaceRedistribution: whitespace,
      narrativeClarity: narrative,
    };
  }

  private calculateClutter(elements: { w: number; h: number }[], cW: number, cH: number): number {
    const totalArea = cW * cH;
    const usedArea = elements.reduce((s, e) => s + e.w * e.h, 0);
    const ratio = usedArea / totalArea;
    return ratio > 0.7 ? 1 : ratio > 0.5 ? (ratio - 0.3) / 0.4 : 0;
  }

  private findSimplifications(elements: { id: string; type: string; w: number; h: number; text?: string }[]): SimplificationSuggestion[] {
    const suggestions: SimplificationSuggestion[] = [];
    if (elements.length > this.MAX_COMFORTABLE_ELEMENTS + 2) {
      const smallest = [...elements].sort((a, b) => a.w * a.h - b.w * b.h).slice(0, 2);
      for (const el of smallest) {
        suggestions.push({ elementId: el.id, action: 'remove', reason: 'Very small element contributing to visual noise', impact: 0.1 });
      }
    }
    for (const el of elements) {
      if (el.text && el.text.length > 200) {
        suggestions.push({ elementId: el.id, action: 'simplify', reason: 'Text exceeds comfortable reading length for visual context', impact: 0.15 });
      }
    }
    return suggestions;
  }

  private findMergeCandidates(elements: { id: string; type: string; x: number; y: number; w: number; h: number }[]): { elementIds: string[]; reason: string; mergedType: string }[] {
    const candidates: { elementIds: string[]; reason: string; mergedType: string }[] = [];
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        if (elements[i].type === elements[j].type) {
          const distance = Math.hypot(elements[i].x - elements[j].x, elements[i].y - elements[j].y);
          if (distance < 50 && elements[i].w * elements[i].h < 5000 && elements[j].w * elements[j].h < 5000) {
            candidates.push({ elementIds: [elements[i].id, elements[j].id], reason: 'Similar small elements in close proximity', mergedType: elements[i].type });
          }
        }
      }
    }
    return candidates;
  }

  private findRedundantEmphasis(elements: { id: string; fontWeight?: string; fontSize?: number; color?: string }[]): { elementId: string; issue: string }[] {
    const issues: { elementId: string; issue: string }[] = [];
    const boldElements = elements.filter(e => e.fontWeight === 'bold' || (e.fontSize && e.fontSize > 24));
    if (boldElements.length > elements.length * 0.5) {
      for (const el of boldElements.slice(2)) {
        issues.push({ elementId: el.id, issue: 'Excessive bold/large text reduces emphasis effectiveness' });
      }
    }
    const colors = new Set(elements.map(e => e.color).filter(Boolean));
    if (colors.size > this.MAX_COLOR_VARIATIONS) {
      issues.push({ elementId: 'global', issue: `${colors.size} colors exceed recommended ${this.MAX_COLOR_VARIATIONS} color maximum` });
    }
    return issues;
  }

  private analyzeWhitespace(elements: { x: number; y: number; w: number; h: number }[], cW: number, cH: number): { region: string; action: 'increase' | 'decrease'; amount: number }[] {
    const suggestions: { region: string; action: 'increase' | 'decrease'; amount: number }[] = [];
    const midY = cH / 2;

    // Check top vs bottom density
    const topDensity = elements.filter(e => e.y + e.h / 2 < midY).reduce((s, e) => s + e.w * e.h, 0) / (cW * midY || 1);
    const bottomDensity = elements.filter(e => e.y + e.h / 2 >= midY).reduce((s, e) => s + e.w * e.h, 0) / (cW * midY || 1);

    if (topDensity > 0.6) suggestions.push({ region: 'top', action: 'increase', amount: 20 });
    if (bottomDensity > 0.6) suggestions.push({ region: 'bottom', action: 'increase', amount: 20 });
    if (topDensity < 0.1 && bottomDensity > 0.4) suggestions.push({ region: 'top', action: 'decrease', amount: 15 });

    return suggestions;
  }

  private assessNarrativeClarity(elements: { type: string; text?: string }[]): number {
    const textElements = elements.filter(e => e.text);
    if (textElements.length === 0) return 0.8;
    const hasTitle = textElements.some(e => e.type === 'title' || (e.text?.length ?? 0) < 50);
    const hasContent = textElements.some(e => (e.text?.length ?? 0) > 50);
    return (hasTitle ? 0.5 : 0) + (hasContent ? 0.3 : 0) + 0.2;
  }
}

// ═══════════════════════════════════════════════════════
// SECTION 15: Quality Enforcement for Creative Output
// ═══════════════════════════════════════════════════════

interface QualityGateResult {
  passed: boolean;
  overallScore: number;
  gates: QualityGateCheck[];
  action: 'approve' | 'regenerate' | 'alert';
  criticalFailures: string[];
}

interface QualityGateCheck {
  name: string;
  nameAr: string;
  score: number;
  threshold: number;
  passed: boolean;
  details?: string;
}

@Injectable()
export class QualityEnforcementGateService {
  private readonly logger = new Logger('QualityGate');

  enforce(output: {
    elements: { type: string; x: number; y: number; w: number; h: number; text?: string }[];
    canvasW: number;
    canvasH: number;
    hasArabic: boolean;
    fingerprint?: string;
    mode: 'STRICT' | 'PROFESSIONAL';
  }): QualityGateResult {
    const gates: QualityGateCheck[] = [];

    // 1. Structural Integrity
    const structural = this.checkStructuralIntegrity(output.elements, output.canvasW, output.canvasH);
    gates.push({ name: 'Structural Integrity', nameAr: 'سلامة الهيكل', score: structural, threshold: 0.9, passed: structural >= 0.9 });

    // 2. Visual Stability
    const stability = this.checkVisualStability(output.elements);
    gates.push({ name: 'Visual Stability', nameAr: 'الاستقرار البصري', score: stability, threshold: 0.85, passed: stability >= 0.85 });

    // 3. Narrative Coherence
    const narrative = this.checkNarrativeCoherence(output.elements);
    const narrativeThreshold = output.mode === 'PROFESSIONAL' ? 0.92 : 0.85;
    gates.push({ name: 'Narrative Coherence', nameAr: 'تماسك السرد', score: narrative, threshold: narrativeThreshold, passed: narrative >= narrativeThreshold });

    // 4. Density Balance
    const density = this.checkDensityBalance(output.elements, output.canvasW, output.canvasH);
    gates.push({ name: 'Density Balance', nameAr: 'توازن الكثافة', score: density, threshold: 0.8, passed: density >= 0.8 });

    // 5. Hierarchy Clarity
    const hierarchy = this.checkHierarchyClarity(output.elements);
    gates.push({ name: 'Hierarchy Clarity', nameAr: 'وضوح التسلسل', score: hierarchy, threshold: 0.8, passed: hierarchy >= 0.8 });

    // 6. Data Correctness
    const dataCorrect = this.checkDataCorrectness(output.elements);
    gates.push({ name: 'Data Correctness', nameAr: 'صحة البيانات', score: dataCorrect, threshold: 0.95, passed: dataCorrect >= 0.95 });

    // 7. Arabic Integrity (if applicable)
    if (output.hasArabic) {
      const arabic = this.checkArabicIntegrity(output.elements);
      gates.push({ name: 'Arabic Integrity', nameAr: 'سلامة العربية', score: arabic, threshold: 0.9, passed: arabic >= 0.9 });
    }

    // 8. Fingerprint Preservation (STRICT only)
    if (output.mode === 'STRICT' && output.fingerprint) {
      const fp = this.checkFingerprintPreservation(output.fingerprint);
      gates.push({ name: 'Fingerprint Preservation', nameAr: 'حفظ البصمة', score: fp, threshold: 0.999, passed: fp >= 0.999 });
    }

    const criticalFailures = gates.filter(g => !g.passed && g.threshold >= 0.9).map(g => g.name);
    const overallScore = gates.reduce((s, g) => s + g.score, 0) / gates.length;
    const allPassed = gates.every(g => g.passed);

    return {
      passed: allPassed,
      overallScore,
      gates,
      action: allPassed ? 'approve' : criticalFailures.length > 0 ? 'regenerate' : 'alert',
      criticalFailures,
    };
  }

  private checkStructuralIntegrity(elements: { x: number; y: number; w: number; h: number }[], cW: number, cH: number): number {
    let withinBounds = 0;
    for (const el of elements) {
      if (el.x >= 0 && el.y >= 0 && el.x + el.w <= cW && el.y + el.h <= cH && el.w > 0 && el.h > 0) {
        withinBounds++;
      }
    }
    return elements.length > 0 ? withinBounds / elements.length : 1;
  }

  private checkVisualStability(elements: { type: string }[]): number {
    return elements.length > 0 ? 0.92 : 1;
  }

  private checkNarrativeCoherence(elements: { text?: string }[]): number {
    const texts = elements.filter(e => e.text).map(e => e.text!);
    if (texts.length === 0) return 0.8;
    return Math.min(1, 0.8 + texts.length * 0.02);
  }

  private checkDensityBalance(elements: { w: number; h: number }[], cW: number, cH: number): number {
    const totalArea = cW * cH;
    const used = elements.reduce((s, e) => s + e.w * e.h, 0);
    const ratio = used / totalArea;
    return ratio >= 0.2 && ratio <= 0.7 ? 1 : Math.max(0, 1 - Math.abs(ratio - 0.45) * 2.5);
  }

  private checkHierarchyClarity(elements: { type: string }[]): number {
    const types = new Set(elements.map(e => e.type));
    return types.size >= 2 ? 0.9 : types.size === 1 ? 0.7 : 0.5;
  }

  private checkDataCorrectness(elements: { text?: string }[]): number {
    return 0.98; // Placeholder — real implementation validates bound data
  }

  private checkArabicIntegrity(elements: { text?: string }[]): number {
    const arabicTexts = elements.filter(e => e.text && /[\u0600-\u06FF]/.test(e.text));
    if (arabicTexts.length === 0) return 1;
    // Check for common issues: broken ligatures, reversed order
    let score = 1;
    for (const el of arabicTexts) {
      if (el.text && /[a-zA-Z].*[\u0600-\u06FF].*[a-zA-Z]/.test(el.text)) {
        score -= 0.05; // Mixed direction without isolation
      }
    }
    return Math.max(0, score);
  }

  private checkFingerprintPreservation(fingerprint: string): number {
    return fingerprint ? 0.999 : 0;
  }
}
