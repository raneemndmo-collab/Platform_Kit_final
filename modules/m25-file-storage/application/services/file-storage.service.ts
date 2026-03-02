// M25: File Storage - Application Service
import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileMetadata, FileVersion, FileAccessLog, ScanResult } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    @InjectRepository(FileMetadata, 'm25_connection') private fileRepo: Repository<FileMetadata>,
    @InjectRepository(FileVersion, 'm25_connection') private versionRepo: Repository<FileVersion>,
    @InjectRepository(FileAccessLog, 'm25_connection') private accessLogRepo: Repository<FileAccessLog>,
    @InjectRepository(ScanResult, 'm25_connection') private scanRepo: Repository<ScanResult>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === File Upload ===
  async uploadFile(tenantId: string, data: {
    originalName: string; mimeType: string; sizeBytes: number;
    buffer: Buffer; folderId?: string; uploadedBy: string;
    storageProvider?: string;
  }): Promise<FileMetadata> {
    const contentHash = crypto.createHash('sha256').update(data.buffer).digest('hex');
    const storedName = `${Date.now()}-${crypto.randomUUID()}`;
    const storagePath = `tenants/${tenantId}/files/${storedName}`;

    const file = this.fileRepo.create({
      tenantId, originalName: data.originalName, storedName,
      mimeType: data.mimeType, sizeBytes: data.sizeBytes,
      contentHash, storageProvider: data.storageProvider || 'local',
      storagePath, folderId: data.folderId || null,
      uploadedBy: data.uploadedBy, status: 'active',
    });
    const saved = await this.fileRepo.save(file);

    // Create initial version
    await this.versionRepo.save(this.versionRepo.create({
      tenantId, fileId: saved.id, versionNumber: 1,
      storagePath, sizeBytes: data.sizeBytes, contentHash,
      createdBy: data.uploadedBy,
    }));

    // Log access
    await this.logAccess(tenantId, saved.id, 'upload', data.uploadedBy);

    // Trigger scan
    await this.scanRepo.save(this.scanRepo.create({
      tenantId, fileId: saved.id, scanEngine: 'clamav',
      scanStatus: 'pending',
    }));

    this.safeEmit('file.stored', { tenantId, fileId: saved.id, originalName: data.originalName, mimeType: data.mimeType, sizeBytes: data.sizeBytes });
    return saved;
  }

  // === File Download ===
  async getFile(tenantId: string, fileId: string): Promise<FileMetadata> {
    return this.fileRepo.findOneOrFail({ where: { id: fileId, tenantId, status: 'active' } });
  }

  async listFiles(tenantId: string, folderId?: string): Promise<FileMetadata[]> {
    const where: Record<string, unknown> = { tenantId, status: 'active' };
    if (folderId) where.folderId = folderId;
    return this.fileRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // === Versioning ===
  async createVersion(tenantId: string, fileId: string, data: {
    buffer: Buffer; sizeBytes: number; changeDescription?: string; createdBy: string;
  }): Promise<FileVersion> {
    const file = await this.fileRepo.findOneOrFail({ where: { id: fileId, tenantId } });
    const lastVersion = await this.versionRepo.findOne({ where: { fileId, tenantId }, order: { versionNumber: 'DESC' } });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;
    const contentHash = crypto.createHash('sha256').update(data.buffer).digest('hex');
    const storagePath = `tenants/${tenantId}/files/${file.storedName}/v${versionNumber}`;

    const version = await this.versionRepo.save(this.versionRepo.create({
      tenantId, fileId, versionNumber, storagePath,
      sizeBytes: data.sizeBytes, contentHash,
      changeDescription: data.changeDescription, createdBy: data.createdBy,
    }));

    // Update file metadata
    await this.fileRepo.update({ id: fileId, tenantId }, { contentHash, sizeBytes: data.sizeBytes, storagePath });
    return version;
  }

  async getVersionHistory(tenantId: string, fileId: string): Promise<FileVersion[]> {
    return this.versionRepo.find({ where: { fileId, tenantId }, order: { versionNumber: 'DESC' } });
  }

  // === Delete ===
  async deleteFile(tenantId: string, fileId: string, userId: string): Promise<void> {
    await this.fileRepo.update({ id: fileId, tenantId }, { status: 'deleted' });
    await this.logAccess(tenantId, fileId, 'delete', userId);
    this.safeEmit('file.deleted', { tenantId, fileId });
  }

  // === Scan ===
  async completeScan(tenantId: string, fileId: string, result: { scanStatus: string; threatName?: string }): Promise<void> {
    await this.scanRepo.update({ fileId, tenantId, scanStatus: 'pending' }, { scanStatus: result.scanStatus, threatName: result.threatName, scannedAt: new Date() });
    if (result.scanStatus === 'infected') {
      await this.fileRepo.update({ id: fileId, tenantId }, { status: 'quarantined' });
    }
    this.safeEmit('file.scanned', { tenantId, fileId, scanStatus: result.scanStatus });
  }

  // === Access Logging ===
  private async logAccess(tenantId: string, fileId: string, action: string, userId: string): Promise<void> {
    await this.accessLogRepo.save(this.accessLogRepo.create({ tenantId, fileId, action, userId }));
  }

  // === Health ===
  async health(): Promise<{ status: string; database: string }> {
    try {
      await this.fileRepo.query('SELECT 1');
      return { status: 'healthy', database: 'connected' };
    } catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
