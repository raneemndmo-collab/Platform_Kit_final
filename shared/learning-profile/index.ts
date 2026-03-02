// Rasid v6.4 — Learning Preference Profile — Part XVII
import { BoundedMap } from '../bounded-collections';

export interface UserAction { type: string; target: string; value?: unknown; timestamp: number; }
export interface PreferenceSuggestion { setting: string; suggestedValue: unknown; confidence: number; basedOn: number; }

export class LearningPreferenceEngine {
  private actions = new BoundedMap<string, UserAction[]>(10_000);
  private readonly MIN_ACTIONS_FOR_SUGGESTION = 5;

  recordAction(userId: string, action: UserAction): void {
    if (!this.actions.has(userId)) this.actions.set(userId, []);
    const hist = this.actions.get(userId)!;
    hist.push(action);
    if (hist.length > 500) this.actions.set(userId, hist.slice(-300));
  }

  getSuggestions(userId: string): PreferenceSuggestion[] {
    const hist = this.actions.get(userId) || [];
    if (hist.length < this.MIN_ACTIONS_FOR_SUGGESTION) return [];

    const suggestions: PreferenceSuggestion[] = [];

    // Spacing preference detection
    const spacingActions = hist.filter(a => a.type === 'adjust_spacing');
    if (spacingActions.length >= 3) {
      const values = spacingActions.map(a => a.value as number).filter(v => typeof v === 'number');
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      suggestions.push({ setting: 'default_spacing', suggestedValue: Math.round(mean), confidence: Math.min(0.9, 0.5 + spacingActions.length * 0.08), basedOn: spacingActions.length });
    }

    // Layout preference detection
    const layoutActions = hist.filter(a => a.type === 'change_layout');
    if (layoutActions.length >= 3) {
      const typeCounts = new BoundedMap<string, number>(10_000);
      for (const a of layoutActions) typeCounts.set(a.value, (typeCounts.get(a.value) || 0) + 1);
      const preferred = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (preferred && preferred[1] >= 3) {
        suggestions.push({ setting: 'preferred_layout', suggestedValue: preferred[0], confidence: preferred[1] / layoutActions.length, basedOn: preferred[1] });
      }
    }

    // Font size preference
    const fontActions = hist.filter(a => a.type === 'adjust_font_size');
    if (fontActions.length >= 3) {
      const values = fontActions.map(a => a.value as number).filter(v => typeof v === 'number');
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      suggestions.push({ setting: 'default_font_size', suggestedValue: Math.round(mean), confidence: Math.min(0.9, 0.5 + fontActions.length * 0.08), basedOn: fontActions.length });
    }

    // Mode preference
    const modeActions = hist.filter(a => a.type === 'select_mode');
    if (modeActions.length >= 5) {
      const modeCounts = new BoundedMap<string, number>(10_000);
      for (const a of modeActions) modeCounts.set(a.value, (modeCounts.get(a.value) || 0) + 1);
      const preferred = [...modeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (preferred) {
        suggestions.push({ setting: 'default_mode', suggestedValue: preferred[0], confidence: preferred[1] / modeActions.length, basedOn: preferred[1] });
      }
    }

    return suggestions.filter(s => s.confidence >= 0.5);
  }

  getActionCount(userId: string): number { return (this.actions.get(userId) || []).length; }
  clearProfile(userId: string): void { this.actions.delete(userId); }
}
