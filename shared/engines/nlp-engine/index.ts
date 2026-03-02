// ═══════════════════════════════════════════════════════════════════════════════
// محرك معالجة اللغة الطبيعية — NLP Engine
// رصيد v6.4 — دعم العربية والإنجليزية مع عزل المستأجر
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';
import { CircuitBreaker } from '../../circuit-breaker';

export interface NLPResult {
  tenantId: string;
  text: string;
  language: 'ar' | 'en' | 'mixed';
  entities: Array<{ text: string; type: string; start: number; end: number; confidence: number }>;
  sentiment: { score: number; label: 'positive' | 'negative' | 'neutral'; confidence: number };
  topics: Array<{ name: string; score: number }>;
  summary?: string;
  keywords: string[];
  tokensUsed: number;
}

export interface ClassificationResult {
  tenantId: string;
  text: string;
  category: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
}

@Injectable()
export class NLPEngine {
  private readonly logger = new Logger(NLPEngine.name);
  private readonly breaker = new CircuitBreaker('nlp-engine', 5, 30000);
  private readonly resultCache = new BoundedMap<string, NLPResult>(50000);
  private readonly TOKEN_BUDGET = 32000;

  private readonly arabicStopWords = new Set(['في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي', 'هو', 'هي', 'أن', 'كان', 'لا', 'ما', 'قد']);
  private readonly englishStopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for']);

  async analyze(tenantId: string, text: string): Promise<NLPResult> {
    const cacheKey = `${tenantId}:${text.slice(0, 100)}`;
    const cached = this.resultCache.get(cacheKey);
    if (cached) return cached;

    return this.breaker.execute(async () => {
      this.logger.log(`تحليل NLP: tenant=${tenantId} length=${text.length}`);
      const tokens = this.estimateTokens(text);
      if (tokens > this.TOKEN_BUDGET) {
        text = text.slice(0, this.TOKEN_BUDGET * 4);
      }

      const language = this.detectLanguage(text);
      const entities = this.extractEntities(text, language);
      const sentiment = this.analyzeSentiment(text, language);
      const topics = this.extractTopics(text, language);
      const keywords = this.extractKeywords(text, language);
      const summary = text.length > 500 ? this.summarize(text, language) : undefined;

      const result: NLPResult = {
        tenantId, text: text.slice(0, 200), language,
        entities, sentiment, topics, summary, keywords,
        tokensUsed: this.estimateTokens(text),
      };

      this.resultCache.set(cacheKey, result);
      return result;
    });
  }

  async classify(tenantId: string, text: string, categories: string[]): Promise<ClassificationResult> {
    this.logger.log(`تصنيف: tenant=${tenantId} categories=${categories.length}`);
    const keywords = this.extractKeywords(text, this.detectLanguage(text));
    const scores = categories.map(cat => ({
      category: cat,
      confidence: keywords.some(k => cat.toLowerCase().includes(k.toLowerCase())) ? 0.8 : 0.2 + Math.random() * 0.3,
    }));
    scores.sort((a, b) => b.confidence - a.confidence);
    return {
      tenantId, text: text.slice(0, 200),
      category: scores[0].category,
      confidence: scores[0].confidence,
      alternatives: scores.slice(1, 4),
    };
  }

  private detectLanguage(text: string): 'ar' | 'en' | 'mixed' {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const total = arabicChars + latinChars;
    if (total === 0) return 'en';
    const arabicRatio = arabicChars / total;
    if (arabicRatio > 0.7) return 'ar';
    if (arabicRatio < 0.3) return 'en';
    return 'mixed';
  }

  private extractEntities(text: string, lang: string): NLPResult['entities'] {
    const entities: NLPResult['entities'] = [];
    // كشف الأرقام
    const numRegex = /\b\d+(\.\d+)?\b/g;
    let match;
    while ((match = numRegex.exec(text)) !== null) {
      entities.push({ text: match[0], type: 'NUMBER', start: match.index, end: match.index + match[0].length, confidence: 0.95 });
    }
    // كشف التواريخ
    const dateRegex = /\b\d{4}[-/]\d{2}[-/]\d{2}\b/g;
    while ((match = dateRegex.exec(text)) !== null) {
      entities.push({ text: match[0], type: 'DATE', start: match.index, end: match.index + match[0].length, confidence: 0.9 });
    }
    // كشف البريد الإلكتروني
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({ text: match[0], type: 'EMAIL', start: match.index, end: match.index + match[0].length, confidence: 0.95 });
    }
    return entities;
  }

  private analyzeSentiment(text: string, lang: string): NLPResult['sentiment'] {
    const positiveAr = ['ممتاز', 'جيد', 'رائع', 'نجاح', 'تحسن', 'إيجابي'];
    const negativeAr = ['سيء', 'فشل', 'مشكلة', 'خطأ', 'سلبي', 'تراجع'];
    const positiveEn = ['good', 'great', 'excellent', 'success', 'improve', 'positive'];
    const negativeEn = ['bad', 'fail', 'error', 'problem', 'negative', 'decline'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of words) {
      if (positiveAr.some(p => w.includes(p)) || positiveEn.includes(w)) score += 0.1;
      if (negativeAr.some(n => w.includes(n)) || negativeEn.includes(w)) score -= 0.1;
    }
    score = Math.max(-1, Math.min(1, score));
    return {
      score,
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      confidence: Math.abs(score) > 0.3 ? 0.85 : 0.6,
    };
  }

  private extractTopics(text: string, lang: string): Array<{ name: string; score: number }> {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = lang === 'ar' ? this.arabicStopWords : this.englishStopWords;
    const freq = new Map<string, number>();
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, score: count / words.length }));
  }

  private extractKeywords(text: string, lang: string): string[] {
    return this.extractTopics(text, lang).map(t => t.name);
  }

  private summarize(text: string, lang: string): string {
    const sentences = text.split(/[.!?。]/);
    return sentences.slice(0, 3).join('. ').trim() + '.';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
