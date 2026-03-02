// M21: Search Engine - Application Service
import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SearchIndex, SearchDocument, SearchAnalytics } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(SearchIndex, 'm21_connection') private indexRepo: Repository<SearchIndex>,
    @InjectRepository(SearchDocument, 'm21_connection') private docRepo: Repository<SearchDocument>,
    @InjectRepository(SearchAnalytics, 'm21_connection') private analyticsRepo: Repository<SearchAnalytics>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Index Management ===
  async createIndex(tenantId: string, data: {
    indexName: string; sourceModule: string; fieldMappings: unknown; analyzerConfig?: unknown;
  }): Promise<SearchIndex> {
    const index = await this.indexRepo.save(this.indexRepo.create({ tenantId, ...data }));
    this.safeEmit('search.index.created', { tenantId, indexId: index.id, indexName: data.indexName });
    return index;
  }

  async listIndices(tenantId: string): Promise<SearchIndex[]> {
    return this.indexRepo.find({ where: { tenantId, isActive: true } });
  }

  // === Document Indexing ===
  async indexDocument(tenantId: string, data: {
    indexId: string; entityType: string; entityId: string;
    searchableContent: string; metadata: Record<string, unknown>; facets?: unknown; boostScore?: number;
  }): Promise<SearchDocument> {
    const existing = await this.docRepo.findOne({ where: { tenantId, entityType: data.entityType, entityId: data.entityId } });
    if (existing) {
      Object.assign(existing, data);
      return this.docRepo.save(existing);
    }
    const doc = await this.docRepo.save(this.docRepo.create({ tenantId, ...data }));
    await this.indexRepo.increment({ id: data.indexId, tenantId }, 'documentCount', 1);
    return doc;
  }

  async removeDocument(tenantId: string, entityType: string, entityId: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { tenantId, entityType, entityId } });
    if (doc) {
      await this.docRepo.remove(doc);
      await this.indexRepo.decrement({ id: doc.indexId, tenantId }, 'documentCount', 1);
    }
  }

  // === Search ===
  async search(tenantId: string, data: {
    query: string; indexNames?: string[]; entityTypes?: string[];
    facetFilters?: Record<string, unknown>; page?: number; pageSize?: number; userId?: string;
  }): Promise<{ results: SearchDocument[]; total: number; executionTimeMs: number; facets: unknown }> {
    const start = Date.now();
    const page = data.page || 1;
    const pageSize = data.pageSize || 20;

    const qb = this.docRepo.createQueryBuilder('doc')
      .where('doc.tenantId = :tenantId', { tenantId })
      .andWhere('doc.searchableContent ILIKE :query', { query: `%${data.query}%` });

    if (data.entityTypes?.length) {
      qb.andWhere('doc.entityType IN (:...types)', { types: data.entityTypes });
    }

    const total = await qb.getCount();
    const results = await qb
      .orderBy('doc.boostScore', 'DESC')
      .addOrderBy('doc.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const executionTimeMs = Date.now() - start;

    // Track analytics
    await this.analyticsRepo.save(this.analyticsRepo.create({
      tenantId, query: data.query, resultCount: total,
      executionTimeMs, userId: data.userId,
    }));

    this.safeEmit('search.executed', { tenantId, query: data.query, resultCount: total, executionTimeMs });
    return { results, total, executionTimeMs, facets: {} };
  }

  // === Search Analytics ===
  async trackClick(tenantId: string, data: {
    query: string; clickedResultId: string; clickPosition: number; userId: string;
  }): Promise<void> {
    await this.analyticsRepo.save(this.analyticsRepo.create({
      tenantId, ...data, resultCount: 0,
    }));
  }

  async getPopularSearches(tenantId: string, limit: number = 10): Promise<any[]> {
    return this.analyticsRepo.createQueryBuilder('sa')
      .select('sa.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .where('sa.tenantId = :tenantId', { tenantId })
      .groupBy('sa.query')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getSearchPrecision(tenantId: string): Promise<{ precision: number }> {
    const total = await this.analyticsRepo.count({ where: { tenantId } });
    const clicked = await this.analyticsRepo.count({ where: { tenantId, clickedResultId: ILike('%') } });
    return { precision: total > 0 ? (clicked / total) * 100 : 0 };
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.indexRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
