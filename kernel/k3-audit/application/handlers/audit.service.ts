// Rasid v6.4 — K3 Audit Service
// FIX GOV-001: Hash chain tamper protection for audit records
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class K3AuditService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K3AuditService.name);
  private lastHash: string = '0'.repeat(64); // Genesis hash

  constructor(
    @InjectRepository(require('../../domain/entities').AuditLogEntity, 'audit_connection')
    private readonly auditRepo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {
    // Load last hash on startup
    this.initializeHashChain().catch(e => this.logger.error(`Hash chain init failed: ${e}`));
  }

  // GOV-001: Initialize hash chain from last record
  private async initializeHashChain(): Promise<void> {
    const lastRecord = await this.auditRepo.findOne({ where: {}, order: { createdAt: 'DESC' } });
    if (lastRecord?.integrityHash) this.lastHash = lastRecord.integrityHash;
    this.logger.log(`Audit hash chain initialized: last=${this.lastHash.substring(0, 16)}...`);
  }

  // GOV-001: Compute integrity hash = SHA-256(previousHash + currentRecord)
  private computeIntegrityHash(record: Record<string, unknown>, previousHash: string): string {
    const payload = JSON.stringify({ ...record, _previousHash: previousHash });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  // GOV-001: Create audit record with hash chain
  async createAuditLog(params: {
    tenantId: string; userId?: string; action: string; resource: string;
    resourceId?: string; details?: Record<string, unknown>; ipAddress?: string;
    correlationId?: string;
  }): Promise<unknown> {
    const record = {
      ...params,
      timestamp: new Date(),
      previousHash: this.lastHash,
    };

    // GOV-001: Compute hash chain
    const integrityHash = this.computeIntegrityHash(record, this.lastHash);

    const entity = this.auditRepo.create({
      ...record,
      integrityHash,
      previousHash: this.lastHash,
    });

    const saved = await this.auditRepo.save(entity);
    this.lastHash = integrityHash;

    try { this.safeEmit('audit.log.created', { tenantId: params.tenantId, action: params.action, resource: params.resource }); }
    catch (e) { this.logger.error(`Audit event failed: ${e}`); }

    return saved;
  }

  // GOV-001: Verify hash chain integrity
  async verifyChainIntegrity(tenantId: string, limit: number = 100): Promise<{ valid: boolean; checkedRecords: number; brokenAt?: number }> {
    const records = await this.auditRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    let previousHash = '0'.repeat(64);
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const expected = this.computeIntegrityHash(
        { tenantId: record.tenantId, userId: record.userId, action: record.action, resource: record.resource, resourceId: record.resourceId, details: record.details, ipAddress: record.ipAddress, correlationId: record.correlationId, timestamp: record.timestamp, previousHash },
        previousHash
      );
      if (record.integrityHash !== expected) {
        return { valid: false, checkedRecords: i + 1, brokenAt: i };
      }
      previousHash = record.integrityHash;
    }
    return { valid: true, checkedRecords: records.length };
  }

  async findByTenant(tenantId: string, options?: { limit?: number; offset?: number }) {
    return this.auditRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  // A3 FIX: Batch audit logging — single DB write for multiple records
  async logBatch(tenantId: string, records: Array<{
    userId: string; action: string; resource: string; resourceId?: string; details?: Record<string, unknown>;
  }>): Promise<{ logged: number }> {
    const entities = records.map(r => this.auditRepo.create({
      tenantId, ...r, timestamp: new Date(),
      integrityHash: this.computeIntegrityHash(r as Record<string, unknown>, this.lastHash),
    }));
    await this.auditRepo.save(entities);
    return { logged: entities.length };
  }
}
