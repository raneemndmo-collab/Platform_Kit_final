import { Injectable, BadRequestException , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiDocumentation, SandboxEnvironment, ApiUsageStats } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class DevPortalService {
  private readonly logger = new Logger(DevPortalService.name);

  constructor(
    @InjectRepository(ApiKey, 'm31_connection') private keyRepo: Repository<ApiKey>,
    @InjectRepository(ApiDocumentation, 'm31_connection') private docRepo: Repository<ApiDocumentation>,
    @InjectRepository(SandboxEnvironment, 'm31_connection') private sandboxRepo: Repository<SandboxEnvironment>,
    @InjectRepository(ApiUsageStats, 'm31_connection') private statsRepo: Repository<ApiUsageStats>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === API Key Management ===
  async generateApiKey(tenantId: string, data: {
    name: string; scopes: string[]; rateLimits?: unknown; allowedIPs?: string[];
    createdBy: string; expiresAt?: Date;
  }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `rsk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await this.keyRepo.save(this.keyRepo.create({
      tenantId, ...data, keyHash, keyPrefix,
      rateLimits: data.rateLimits || { requestsPerMinute: 60, requestsPerDay: 10000 },
    }));
    this.safeEmit('devportal.apikey.created', { tenantId, keyId: apiKey.id, scopes: data.scopes });
    return { apiKey, rawKey };
  }

  async validateApiKey(keyHash: string): Promise<ApiKey | null> {
    const key = await this.keyRepo.findOne({ where: { keyHash, status: 'active' } });
    if (key && key.expiresAt && key.expiresAt < new Date()) {
      await this.keyRepo.update(key.id, { status: 'expired' });
      return null;
    }
    if (key) await this.keyRepo.update(key.id, { lastUsedAt: new Date() });
    return key;
  }

  async revokeApiKey(tenantId: string, keyId: string): Promise<void> {
    await this.keyRepo.update({ id: keyId, tenantId }, { status: 'revoked' });
    this.safeEmit('devportal.apikey.revoked', { tenantId, keyId });
  }

  async listApiKeys(tenantId: string): Promise<ApiKey[]> {
    return this.keyRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async rotateApiKey(tenantId: string, keyId: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const oldKey = await this.keyRepo.findOneOrFail({ where: { id: keyId, tenantId } });
    await this.revokeApiKey(tenantId, keyId);
    return this.generateApiKey(tenantId, {
      name: oldKey.name, scopes: oldKey.scopes as string[],
      rateLimits: oldKey.rateLimits, allowedIPs: oldKey.allowedIPs as string[],
      createdBy: oldKey.createdBy,
    });
  }

  // === API Documentation ===
  async publishDocs(tenantId: string, data: { moduleId: string; version: string; openApiSpec: string }): Promise<ApiDocumentation> {
    const doc = await this.docRepo.save(this.docRepo.create({ tenantId, ...data, status: 'published', publishedAt: new Date() }));
    this.safeEmit('devportal.docs.published', { tenantId, moduleId: data.moduleId, version: data.version });
    return doc;
  }

  async getDocs(tenantId: string, moduleId: string, version?: string): Promise<ApiDocumentation | null> {
    const where: Record<string, unknown> = { tenantId, moduleId, status: 'published' };
    if (version) where.version = version;
    return this.docRepo.findOne({ where, order: { publishedAt: 'DESC' } });
  }

  async listDocs(tenantId: string): Promise<ApiDocumentation[]> {
    return this.docRepo.find({ where: { tenantId, status: 'published' }, order: { publishedAt: 'DESC' } });
  }

  // === Sandbox ===
  async createSandbox(tenantId: string, data: { name: string; config?: unknown; createdBy: string }): Promise<SandboxEnvironment> {
    const sandbox = await this.sandboxRepo.save(this.sandboxRepo.create({
      tenantId, ...data, baseUrl: `https://sandbox-${Date.now()}.rasid.dev`,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600000),
    }));
    this.safeEmit('devportal.sandbox.created', { tenantId, sandboxId: sandbox.id });
    return sandbox;
  }

  async listSandboxes(tenantId: string): Promise<SandboxEnvironment[]> {
    return this.sandboxRepo.find({ where: { tenantId, status: 'active' } });
  }

  // === Usage Stats ===
  async recordApiUsage(tenantId: string, data: { apiKeyId: string; endpoint: string; period: string; latencyMs: number; isError: boolean }): Promise<void> {
    const existing = await this.statsRepo.findOne({ where: { tenantId, apiKeyId: data.apiKeyId, endpoint: data.endpoint, period: data.period } });
    if (existing) {
      existing.requestCount++;
      if (data.isError) existing.errorCount++;
      existing.avgLatencyMs = Math.round(((existing.avgLatencyMs || 0) * (existing.requestCount - 1) + data.latencyMs) / existing.requestCount);
      await this.statsRepo.save(existing);
    } else {
      await this.statsRepo.save(this.statsRepo.create({
        tenantId, ...data, requestCount: 1, errorCount: data.isError ? 1 : 0, avgLatencyMs: data.latencyMs,
      }));
    }
  }

  async getApiUsageStats(tenantId: string, apiKeyId?: string): Promise<ApiUsageStats[]> {
    const where: Record<string, unknown> = { tenantId };
    if (apiKeyId) where.apiKeyId = apiKeyId;
    return this.statsRepo.find({ where, order: { recordedAt: 'DESC' }, take: 100 });
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.keyRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
