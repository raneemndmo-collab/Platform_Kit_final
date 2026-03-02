// M25: File Storage - Domain Entities
// Database: files_db | Event Namespace: file.*
// Purpose: File management: upload, download, versioning, access control, virus scanning, storage provider abstraction

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('file_metadata')
@Index(['tenantId', 'folderId'])
@Index(['tenantId', 'contentHash'])
export class FileMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  originalName: string;

  @Column()
  storedName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column()
  contentHash: string; // SHA-256

  @Column()
  storageProvider: string; // s3, azure-blob, gcs, local

  @Column()
  storagePath: string;

  @Column({ nullable: true })
  folderId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ default: 'active' })
  status: string; // active, archived, deleted, quarantined

  @Column({ nullable: true })
  uploadedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('file_versions')
@Index(['tenantId', 'fileId'])
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  fileId: string;

  @Column()
  versionNumber: number;

  @Column()
  storagePath: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column()
  contentHash: string;

  @Column({ nullable: true })
  changeDescription: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('file_access_logs')
@Index(['tenantId', 'fileId'])
export class FileAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  fileId: string;

  @Column()
  action: string; // upload, download, view, delete, share

  @Column()
  userId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @CreateDateColumn()
  timestamp: Date;
}

@Entity('scan_results')
@Index(['tenantId', 'fileId'])
export class ScanResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  @Column()
  fileId: string;

  @Column()
  scanEngine: string;

  @Column()
  scanStatus: string; // pending, clean, infected, error

  @Column({ nullable: true })
  threatName: string;

  @Column({ type: 'jsonb', nullable: true })
  scanDetails: Record<string, unknown>;

  @CreateDateColumn()
  scannedAt: Date;
}
