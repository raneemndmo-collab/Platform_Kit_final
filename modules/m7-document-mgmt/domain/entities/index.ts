// M7: Document Management - Domain Entities
// Database: documents_db | Event Namespace: document.*
// Purpose: Document lifecycle, versioning, templates, approvals, archival

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('documents')
@Index(['tenantId', 'folderId'])
@Index(['tenantId', 'status'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  documentType: string; // policy, procedure, template, report, form

  @Column({ nullable: true })
  templateId: string;

  @Column({ nullable: true })
  fileId: string; // Reference to M25 file

  @Column({ nullable: true })
  folderId: string;

  @Column({ default: 'draft' })
  status: string; // draft, review, approved, published, archived, obsolete

  @Column({ default: 1 })
  currentVersion: number;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  content: string; // Rich text content

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('document_versions')
@Index(['tenantId', 'documentId'])
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  documentId: string;

  @Column()
  versionNumber: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  fileId: string;

  @Column({ nullable: true })
  changeNote: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('document_folders')
@Index(['tenantId', 'parentId'])
export class DocumentFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  parentId: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('document_templates')
@Index(['tenantId', 'category'])
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'text' })
  templateContent: string;

  @Column({ type: 'jsonb', nullable: true })
  fields: Record<string, unknown>; // Dynamic fields definition

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('document_approvals')
@Index(['tenantId', 'documentId'])
export class DocumentApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() @Index()
  tenantId: string;

  @Column()
  documentId: string;

  @Column()
  approverId: string;

  @Column({ default: 'pending' })
  status: string; // pending, approved, rejected

  @Column({ nullable: true })
  comments: string;

  @Column({ type: 'timestamp', nullable: true })
  decidedAt: Date;

  @Column()
  stepOrder: number;

  @CreateDateColumn()
  requestedAt: Date;
}
