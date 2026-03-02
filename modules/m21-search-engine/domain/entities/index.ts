// M21: Search Engine - Domain Entities
// Database: search_db | Event Namespace: search.*
// Purpose: Full-text search, indexing, relevance scoring, faceted search, search analytics

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('search_indices')
@Index(['tenantId', 'indexName'])
export class SearchIndex {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  indexName: string;

  @Column()
  sourceModule: string;

  @Column({ type: 'jsonb' })
  fieldMappings: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  analyzerConfig: Record<string, unknown>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  documentCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastReindexedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('search_documents')
@Index(['tenantId', 'indexId', 'entityType'])
@Index(['tenantId', 'entityType', 'entityId'])
export class SearchDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  indexId: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column({ type: 'text' })
  searchableContent: string;

  @Column({ type: 'jsonb' })
  metadata: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  facets: Record<string, unknown>;

  @Column({ type: 'float', default: 1.0 })
  boostScore: number;

  @CreateDateColumn()
  indexedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('search_analytics')
@Index(['tenantId', 'query'])
export class SearchAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  query: string;

  @Column({ type: 'int', default: 0 })
  resultCount: number;

  @Column({ type: 'int', nullable: true })
  executionTimeMs: number;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  clickedResultId: string;

  @Column({ type: 'int', nullable: true })
  clickPosition: number;

  @Column({ type: 'float', nullable: true })
  relevanceScore: number;

  @CreateDateColumn()
  searchedAt: Date;
}
