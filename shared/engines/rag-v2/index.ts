// ═══════════════════════════════════════════════════════════════════════════════
// محرك RAG v2 — Retrieval-Augmented Generation Engine
// رصيد v6.4 — عزل المستأجر إلزامي
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';
import { CircuitBreaker } from '../../circuit-breaker';

export interface RAGDocument {
  id: string;
  tenantId: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  score?: number;
}

export interface RAGQuery {
  tenantId: string;
  query: string;
  topK?: number;
  filters?: Record<string, unknown>;
  reranking?: boolean;
  maxTokens?: number;
}

export interface RAGResult {
  answer: string;
  sources: RAGDocument[];
  confidence: number;
  tokensUsed: number;
  latencyMs: number;
  correlationId: string;
}

export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
  strategy: 'fixed' | 'semantic' | 'paragraph';
}

@Injectable()
export class RAGv2Engine {
  private readonly logger = new Logger(RAGv2Engine.name);
  private readonly breaker = new CircuitBreaker('rag-v2', 5, 30000);
  private readonly embeddingCache = new BoundedMap<string, number[]>(50000);
  private readonly documentIndex = new BoundedMap<string, RAGDocument[]>(10000);
  private readonly TOKEN_BUDGET = 128000;
  private readonly MEMORY_BUDGET_MB = 512;

  /** فهرسة مستند مع عزل المستأجر */
  async indexDocument(tenantId: string, doc: Omit<RAGDocument, 'tenantId' | 'embedding'>): Promise<RAGDocument> {
    this.logger.log(`فهرسة مستند: tenant=${tenantId} doc=${doc.id}`);
    const chunks = this.chunkContent(doc.content, { chunkSize: 512, overlap: 50, strategy: 'semantic' });
    const embeddings = await Promise.all(chunks.map(c => this.generateEmbedding(c)));
    const indexed: RAGDocument = {
      ...doc,
      tenantId,
      embedding: this.averageEmbeddings(embeddings),
    };

    const tenantDocs = this.documentIndex.get(tenantId) || [];
    tenantDocs.push(indexed);
    this.documentIndex.set(tenantId, tenantDocs);
    return indexed;
  }

  /** استرجاع معزز بالتوليد */
  async query(ragQuery: RAGQuery): Promise<RAGResult> {
    const startTime = Date.now();
    const correlationId = `rag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log(`استعلام RAG: tenant=${ragQuery.tenantId} q="${ragQuery.query.slice(0, 50)}..."`);

    return this.breaker.execute(async () => {
      // 1. استرجاع المستندات ذات الصلة
      const retrieved = await this.retrieve(ragQuery.tenantId, ragQuery.query, ragQuery.topK ?? 10);

      // 2. إعادة ترتيب النتائج
      const reranked = ragQuery.reranking !== false ? this.rerank(ragQuery.query, retrieved) : retrieved;

      // 3. التحقق من ميزانية التوكنات
      const maxTokens = Math.min(ragQuery.maxTokens ?? this.TOKEN_BUDGET, this.TOKEN_BUDGET);
      const contextTokens = this.estimateTokens(reranked.map(d => d.content).join('\n'));
      if (contextTokens > maxTokens * 0.7) {
        reranked.splice(Math.floor(reranked.length * 0.5));
      }

      // 4. توليد الإجابة
      const answer = this.generateAnswer(ragQuery.query, reranked);
      const tokensUsed = this.estimateTokens(answer) + contextTokens;

      return {
        answer,
        sources: reranked.slice(0, 5),
        confidence: reranked.length > 0 ? reranked[0].score ?? 0.8 : 0,
        tokensUsed,
        latencyMs: Date.now() - startTime,
        correlationId,
      };
    });
  }

  /** تقسيم المحتوى إلى أجزاء */
  chunkContent(content: string, options: ChunkOptions): string[] {
    const chunks: string[] = [];
    if (options.strategy === 'paragraph') {
      const paragraphs = content.split(/\n\n+/);
      let current = '';
      for (const p of paragraphs) {
        if (this.estimateTokens(current + p) > options.chunkSize) {
          if (current) chunks.push(current.trim());
          current = p;
        } else {
          current += '\n\n' + p;
        }
      }
      if (current) chunks.push(current.trim());
    } else {
      for (let i = 0; i < content.length; i += options.chunkSize - options.overlap) {
        chunks.push(content.slice(i, i + options.chunkSize));
      }
    }
    return chunks.filter(c => c.length > 10);
  }

  /** استرجاع المستندات حسب التشابه */
  private async retrieve(tenantId: string, query: string, topK: number): Promise<RAGDocument[]> {
    const tenantDocs = this.documentIndex.get(tenantId) || [];
    const queryEmbedding = await this.generateEmbedding(query);

    return tenantDocs
      .map(doc => ({
        ...doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding || []),
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, topK);
  }

  /** إعادة ترتيب النتائج */
  private rerank(query: string, docs: RAGDocument[]): RAGDocument[] {
    const queryTerms = new Set(query.toLowerCase().split(/\s+/));
    return docs
      .map(doc => {
        const contentTerms = doc.content.toLowerCase().split(/\s+/);
        const overlap = contentTerms.filter(t => queryTerms.has(t)).length;
        const bm25Score = overlap / (overlap + 1.2);
        return { ...doc, score: ((doc.score ?? 0) * 0.7) + (bm25Score * 0.3) };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private generateAnswer(query: string, context: RAGDocument[]): string {
    const contextText = context.map(d => d.content).join('\n---\n');
    return `[RAG Response] بناءً على ${context.length} مصدر: ${contextText.slice(0, 500)}...`;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const cached = this.embeddingCache.get(text.slice(0, 100));
    if (cached) return cached;
    const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    this.embeddingCache.set(text.slice(0, 100), embedding);
    return embedding;
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) avg[i] += emb[i];
    }
    return avg.map(v => v / embeddings.length);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
