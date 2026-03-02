import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('kg_nodes')
@Index(['tenantId', 'nodeType'])
@Index(['tenantId', 'sourceModule'])
export class KGNode {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() nodeType: string; // entity, concept, document, person, process
  @Column() label: string;
  @Column({ nullable: true }) description: string;
  @Column() sourceModule: string; // Which module created this node
  @Column({ nullable: true }) sourceEntityId: string;
  @Column({ type: 'jsonb', nullable: true }) properties: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) embedding: number[]; // Vector embedding
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('kg_edges')
@Index(['tenantId', 'sourceNodeId'])
@Index(['tenantId', 'targetNodeId'])
@Index(['tenantId', 'relationType'])
export class KGEdge {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() sourceNodeId: string;
  @Column() targetNodeId: string;
  @Column() relationType: string; // belongs_to, manages, depends_on, references, related_to
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 }) weight: number;
  @Column({ type: 'jsonb', nullable: true }) properties: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('kg_queries')
@Index(['tenantId'])
export class KGQuery {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() @Index() tenantId: string;
  @Column() queryText: string;
  @Column() queryType: string; // traversal, similarity, path_finding, subgraph
  @Column({ type: 'jsonb', nullable: true }) result: Record<string, unknown>;
  @Column({ type: 'int', nullable: true }) latencyMs: number;
  @CreateDateColumn() createdAt: Date;
}
