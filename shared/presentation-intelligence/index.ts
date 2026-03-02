// Rasid v6.4 — Presentation Intelligence — GAP-19 Fix
import { Injectable, Logger } from '@nestjs/common';

export interface SlideTemplate {
  id: string;
  type: 'title' | 'content' | 'data' | 'comparison' | 'timeline' | 'summary';
  layout: { columns: number; rows: number; gridAreas: string[] };
  suggestedDuration: number; // seconds
  cognitiveComplexity: number; // 0-1
}

export interface PresentationPlan {
  slides: SlideTemplate[];
  totalDuration: number;
  narrativeArc: string[];
  dataVisualizationSlots: number;
  rtlOptimized: boolean;
}

@Injectable()
export class PresentationIntelligence {
  private readonly logger = new Logger(PresentationIntelligence.name);
  
  private readonly TEMPLATES: SlideTemplate[] = [
    { id: 'title', type: 'title', layout: { columns: 1, rows: 2, gridAreas: ['title', 'subtitle'] }, suggestedDuration: 15, cognitiveComplexity: 0.1 },
    { id: 'content-2col', type: 'content', layout: { columns: 2, rows: 1, gridAreas: ['left', 'right'] }, suggestedDuration: 60, cognitiveComplexity: 0.4 },
    { id: 'data-chart', type: 'data', layout: { columns: 1, rows: 2, gridAreas: ['chart', 'insight'] }, suggestedDuration: 45, cognitiveComplexity: 0.6 },
    { id: 'comparison', type: 'comparison', layout: { columns: 2, rows: 2, gridAreas: ['before', 'after', 'metric-before', 'metric-after'] }, suggestedDuration: 60, cognitiveComplexity: 0.7 },
    { id: 'timeline', type: 'timeline', layout: { columns: 1, rows: 1, gridAreas: ['timeline'] }, suggestedDuration: 45, cognitiveComplexity: 0.5 },
    { id: 'summary', type: 'summary', layout: { columns: 1, rows: 2, gridAreas: ['key-points', 'next-steps'] }, suggestedDuration: 30, cognitiveComplexity: 0.3 },
  ];

  planPresentation(
    dataPoints: number,
    targetDurationMinutes: number,
    language: 'ar' | 'en' = 'ar',
  ): PresentationPlan {
    const targetSeconds = targetDurationMinutes * 60;
    const slides: SlideTemplate[] = [];
    let totalDuration = 0;
    const narrativeArc: string[] = [];

    // Opening
    slides.push(this.TEMPLATES[0]); // title
    totalDuration += 15;
    narrativeArc.push('introduction');

    // Content slides based on data
    const dataSlides = Math.min(Math.ceil(dataPoints / 3), Math.floor(targetSeconds / 60));
    for (let i = 0; i < dataSlides; i++) {
      const template = i % 3 === 0 ? this.TEMPLATES[2] : i % 3 === 1 ? this.TEMPLATES[1] : this.TEMPLATES[3];
      slides.push(template);
      totalDuration += template.suggestedDuration;
      narrativeArc.push(i < dataSlides / 2 ? 'rising_action' : 'climax');
    }

    // Summary
    slides.push(this.TEMPLATES[5]);
    totalDuration += 30;
    narrativeArc.push('conclusion');

    return {
      slides,
      totalDuration,
      narrativeArc,
      dataVisualizationSlots: slides.reduce((___c, s) => (s.type === 'data') ? ___c + 1 : ___c, 0),
      rtlOptimized: language === 'ar',
    };
  }

  selectTemplate(contentType: string, dataComplexity: number): SlideTemplate {
    if (dataComplexity > 0.7) return this.TEMPLATES[2]; // data-chart
    if (contentType === 'comparison') return this.TEMPLATES[3];
    if (contentType === 'timeline') return this.TEMPLATES[4];
    return this.TEMPLATES[1]; // content-2col
  }
}
