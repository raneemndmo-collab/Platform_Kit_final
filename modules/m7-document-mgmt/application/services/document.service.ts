// M7: Document Management - Application Service
import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentVersion, DocumentFolder, DocumentTemplate, DocumentApproval } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document, 'm7_connection') private docRepo: Repository<Document>,
    @InjectRepository(DocumentVersion, 'm7_connection') private versionRepo: Repository<DocumentVersion>,
    @InjectRepository(DocumentFolder, 'm7_connection') private folderRepo: Repository<DocumentFolder>,
    @InjectRepository(DocumentTemplate, 'm7_connection') private templateRepo: Repository<DocumentTemplate>,
    @InjectRepository(DocumentApproval, 'm7_connection') private approvalRepo: Repository<DocumentApproval>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Document CRUD ===
  async createDocument(tenantId: string, data: {
    title: string; documentType: string; content?: string; templateId?: string;
    folderId?: string; ownerId: string; fileId?: string;
  }): Promise<Document> {
    const doc = this.docRepo.create({ tenantId, ...data, status: 'draft', currentVersion: 1 });
    const saved = await this.docRepo.save(doc);
    await this.versionRepo.save(this.versionRepo.create({
      tenantId, documentId: saved.id, versionNumber: 1,
      content: data.content, fileId: data.fileId, createdBy: data.ownerId,
    }));
    this.safeEmit('document.created', { tenantId, documentId: saved.id, title: data.title });
    return saved;
  }

  async updateDocument(tenantId: string, documentId: string, data: {
    content?: string; title?: string; updatedBy: string; changeNote?: string;
  }): Promise<Document> {
    const doc = await this.docRepo.findOneOrFail({ where: { id: documentId, tenantId } });
    if (doc.status === 'archived' || doc.status === 'obsolete')
      throw new BadRequestException('Cannot update archived/obsolete documents');

    const newVersion = doc.currentVersion + 1;
    Object.assign(doc, { ...data, currentVersion: newVersion });
    const saved = await this.docRepo.save(doc);

    await this.versionRepo.save(this.versionRepo.create({
      tenantId, documentId, versionNumber: newVersion,
      content: data.content, changeNote: data.changeNote, createdBy: data.updatedBy,
    }));

    this.safeEmit('document.updated', { tenantId, documentId, version: newVersion });
    return saved;
  }

  async getDocument(tenantId: string, documentId: string): Promise<Document> {
    return this.docRepo.findOneOrFail({ where: { id: documentId, tenantId } });
  }

  async listDocuments(tenantId: string, folderId?: string, status?: string): Promise<Document[]> {
    const where: Record<string, unknown> = { tenantId };
    if (folderId) where.folderId = folderId;
    if (status) where.status = status;
    return this.docRepo.find({ where, order: { updatedAt: 'DESC' } });
  }

  // === Approval Workflow ===
  async submitForApproval(tenantId: string, documentId: string, approvers: string[]): Promise<DocumentApproval[]> {
    const doc = await this.docRepo.findOneOrFail({ where: { id: documentId, tenantId } });
    if (doc.status !== 'draft') throw new BadRequestException('Only draft documents can be submitted');

    await this.docRepo.update({ id: documentId, tenantId }, { status: 'review' });

    const approvals = approvers.map((approverId, i) =>
      this.approvalRepo.create({ tenantId, documentId, approverId, stepOrder: i + 1, status: 'pending' })
    );
    const saved = await this.approvalRepo.save(approvals);
    this.safeEmit('document.submitted', { tenantId, documentId, approverCount: approvers.length });
    return saved;
  }

  async approveDocument(tenantId: string, documentId: string, approverId: string, comments?: string): Promise<void> {
    const approval = await this.approvalRepo.findOneOrFail({
      where: { documentId, tenantId, approverId, status: 'pending' },
    });
    await this.approvalRepo.update(approval.id, { status: 'approved', comments, decidedAt: new Date() });

    const pending = await this.approvalRepo.count({ where: { documentId, tenantId, status: 'pending' } });
    if (pending === 0) {
      await this.docRepo.update({ id: documentId, tenantId }, { status: 'approved', approvedBy: approverId, approvedAt: new Date() });
      this.safeEmit('document.approved', { tenantId, documentId });
    }
  }

  async rejectDocument(tenantId: string, documentId: string, approverId: string, comments: string): Promise<void> {
    await this.approvalRepo.update(
      { documentId, tenantId, approverId, status: 'pending' },
      { status: 'rejected', comments, decidedAt: new Date() },
    );
    await this.docRepo.update({ id: documentId, tenantId }, { status: 'draft' });
    this.safeEmit('document.rejected', { tenantId, documentId, rejectedBy: approverId });
  }

  // === Publish / Archive ===
  async publishDocument(tenantId: string, documentId: string): Promise<void> {
    const doc = await this.docRepo.findOneOrFail({ where: { id: documentId, tenantId } });
    if (doc.status !== 'approved') throw new BadRequestException('Only approved documents can be published');
    await this.docRepo.update({ id: documentId, tenantId }, { status: 'published', publishedAt: new Date() });
    this.safeEmit('document.published', { tenantId, documentId });
  }

  async archiveDocument(tenantId: string, documentId: string): Promise<void> {
    await this.docRepo.update({ id: documentId, tenantId }, { status: 'archived' });
    this.safeEmit('document.archived', { tenantId, documentId });
  }

  // === Versions ===
  async getVersionHistory(tenantId: string, documentId: string): Promise<DocumentVersion[]> {
    return this.versionRepo.find({ where: { documentId, tenantId }, order: { versionNumber: 'DESC' } });
  }

  // === Folders ===
  async createFolder(tenantId: string, data: { name: string; parentId?: string }): Promise<DocumentFolder> {
    return this.folderRepo.save(this.folderRepo.create({ tenantId, ...data }));
  }

  async listFolders(tenantId: string, parentId?: string): Promise<DocumentFolder[]> {
    const where: Record<string, unknown> = { tenantId };
    if (parentId) where.parentId = parentId;
    return this.folderRepo.find({ where });
  }

  // === Templates ===
  async createTemplate(tenantId: string, data: { name: string; category: string; templateContent: string; fields?: unknown }): Promise<DocumentTemplate> {
    return this.templateRepo.save(this.templateRepo.create({ tenantId, ...data }));
  }

  async listTemplates(tenantId: string, category?: string): Promise<DocumentTemplate[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (category) where.category = category;
    return this.templateRepo.find({ where });
  }

  // === Health ===
  async health(): Promise<{ status: string; database: string }> {
    try { await this.docRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
