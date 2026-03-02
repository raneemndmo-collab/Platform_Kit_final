// Rasid v6.4 — Narrative Coherence Engine — Part XIV
import { Injectable, Logger } from '@nestjs/common';

export interface CoherenceResult {
  overallScore: number; titleInsightAlignment: number;
  logicalProgression: number; dataConclusion: number;
  storylineContinuity: number; flowIntegrity: number;
  suggestions: CoherenceSuggestion[];
}

export interface CoherenceSuggestion {
  type: 'title_mismatch' | 'progression_gap' | 'data_disconnect' | 'flow_break';
  elementId: string; message: string; severity: 'low' | 'medium' | 'high';
  autoFixAvailable: boolean;
}

export interface NarrativeElement {
  id: string; type: 'title' | 'subtitle' | 'insight' | 'data' | 'conclusion' | 'annotation';
  content: string; order: number; parentId?: string; dataBindings?: string[];
}

@Injectable()
export class NarrativeCoherenceEngine {
  private readonly logger = new Logger(NarrativeCoherenceEngine.name);

  analyze(elements: NarrativeElement[]): CoherenceResult {
    const sorted = [...elements].sort((a, b) => a.order - b.order);
    const titleInsightAlignment = this.scoreTitleInsightMapping(sorted);
    const logicalProgression = this.scoreLogicalProgression(sorted);
    const dataConclusion = this.scoreDataConclusionAlignment(sorted);
    const storylineContinuity = this.scoreStorylineContinuity(sorted);
    const flowIntegrity = this.scoreFlowIntegrity(sorted);

    const overallScore = (titleInsightAlignment * 0.2 + logicalProgression * 0.25 +
      dataConclusion * 0.25 + storylineContinuity * 0.15 + flowIntegrity * 0.15);

    const suggestions = this.generateSuggestions(sorted, {
      titleInsightAlignment, logicalProgression, dataConclusion, storylineContinuity, flowIntegrity,
    });

    return { overallScore, titleInsightAlignment, logicalProgression, dataConclusion, storylineContinuity, flowIntegrity, suggestions };
  }

  private scoreTitleInsightMapping(elements: NarrativeElement[]): number {
    const titles = elements.filter(e => e.type === 'title' || e.type === 'subtitle');
    const insights = elements.filter(e => e.type === 'insight');
    if (titles.length === 0) return 0.5;
    const matched = titles.filter(t => insights.some(i => this.semanticOverlap(t.content, i.content) > 0.3));
    return matched.length / titles.length;
  }

  private scoreLogicalProgression(elements: NarrativeElement[]): number {
    if (elements.length < 2) return 1;
    let score = 1;
    for (let i = 1; i < elements.length; i++) {
      const typeOrder = ['title', 'subtitle', 'data', 'insight', 'conclusion', 'annotation'];
      const prevIdx = typeOrder.indexOf(elements[i - 1].type);
      const currIdx = typeOrder.indexOf(elements[i].type);
      if (currIdx < prevIdx - 2) score -= 0.1;
    }
    return Math.max(0, score);
  }

  private scoreDataConclusionAlignment(elements: NarrativeElement[]): number {
    const data = elements.filter(e => e.type === 'data');
    const conclusions = elements.filter(e => e.type === 'conclusion');
    if (conclusions.length === 0) return data.length === 0 ? 1 : 0.5;
    const linked = conclusions.filter(c => c.dataBindings && c.dataBindings.length > 0);
    return linked.length / conclusions.length;
  }

  private scoreStorylineContinuity(elements: NarrativeElement[]): number {
    if (elements.length < 3) return 1;
    let gaps = 0;
    for (let i = 1; i < elements.length; i++) {
      if (elements[i].order - elements[i - 1].order > 2) gaps++;
    }
    return Math.max(0, 1 - (gaps * 0.15));
  }

  private scoreFlowIntegrity(elements: NarrativeElement[]): number {
    const hasTitle = elements.some(e => e.type === 'title');
    const hasData = elements.some(e => e.type === 'data');
    const hasConclusion = elements.some(e => e.type === 'conclusion');
    let score = 0.4;
    if (hasTitle) score += 0.2;
    if (hasData) score += 0.2;
    if (hasConclusion) score += 0.2;
    return score;
  }

  private semanticOverlap(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    return wordsA.size > 0 ? intersection.length / wordsA.size : 0;
  }

  private generateSuggestions(elements: NarrativeElement[], scores: Record<string, number>): CoherenceSuggestion[] {
    const suggestions: CoherenceSuggestion[] = [];
    if (scores.titleInsightAlignment < 0.6) {
      suggestions.push({ type: 'title_mismatch', elementId: '', message: 'Title does not align with insights — consider revising title or adding supporting insight', severity: 'medium', autoFixAvailable: false });
    }
    if (scores.logicalProgression < 0.7) {
      suggestions.push({ type: 'progression_gap', elementId: '', message: 'Content does not follow a logical sequence — reorder elements', severity: 'high', autoFixAvailable: true });
    }
    if (scores.dataConclusion < 0.5) {
      suggestions.push({ type: 'data_disconnect', elementId: '', message: 'Conclusions are not linked to data — bind data sources', severity: 'high', autoFixAvailable: false });
    }
    return suggestions;
  }

// GAP-31 FIX: Enforce narrative coherence rules with auto-correction
  enforceCoherenceRules(elements: Array<{ id: string; type: string; title: string; content: string; order: number }>): {
    reordered: Array<{ id: string; newOrder: number; reason: string }>;
    gaps: Array<{ afterId: string; suggestedType: string; reason: string }>;
    coherenceScore: number;
  } {
    const reordered: Array<{ id: string; newOrder: number; reason: string }> = [];
    const gaps: Array<{ afterId: string; suggestedType: string; reason: string }> = [];
    
    // Rule 1: Headers should precede content
    const sorted = [...elements].sort((a, b) => a.order - b.order);
    let lastHeader = -1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].type === 'heading') lastHeader = i;
      if (sorted[i].type === 'paragraph' && lastHeader === -1 && i > 0) {
        gaps.push({ afterId: 'START', suggestedType: 'heading', reason: 'Content without preceding header' });
      }
    }
    
    // Rule 2: Data references should follow their charts
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].type === 'data_reference' && i > 0 && sorted[i - 1].type !== 'chart') {
        const chartIdx = sorted.findIndex(e => e.type === 'chart');
        if (chartIdx >= 0 && chartIdx > i) {
          reordered.push({ id: sorted[i].id, newOrder: sorted[chartIdx].order + 1, reason: 'Data ref moved after chart' });
        }
      }
    }
    
    // Coherence score: how well-ordered is the narrative?
    let orderViolations = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].type === 'heading' && sorted[i - 1].type === 'heading') orderViolations++;
      if (sorted[i].type === 'conclusion' && i < sorted.length - 2) orderViolations++;
    }
    const coherenceScore = Math.max(0, 1 - orderViolations / Math.max(sorted.length, 1));
    
    return { reordered, gaps, coherenceScore };
  }
}
