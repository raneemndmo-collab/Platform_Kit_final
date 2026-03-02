// =============================================================================
// K4: Configuration — Application Layer
// Handles all configuration CRUD, feature flag management, environment profiles
// Constitutional Reference: CQRS separation, P-017 (Audit Everything)
// =============================================================================

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigurationEntity, FeatureFlagEntity, EnvironmentProfileEntity } from '../domain/entities';
import { ConfigChangedEvent, FeatureFlagToggledEvent } from '../domain/events';

// --- DTOs ---
export interface SetConfigDto {
  moduleId: string;
  key: string;
  value: string;
  valueType?: 'string' | 'number' | 'boolean' | 'json';
  environment?: string;
  encrypted?: boolean;
  description?: string;
}

export interface CreateFeatureFlagDto {
  name: string;
  moduleId: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  description?: string;
}

export interface ToggleFeatureFlagDto {
  enabled: boolean;
}

// --- Service ---
@Injectable()
export class K4ConfigService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K4ConfigService.name);

  constructor(
    @InjectRepository(ConfigurationEntity, 'k4_connection')
    private readonly configRepo: Repository<ConfigurationEntity>,
    @InjectRepository(FeatureFlagEntity, 'k4_connection')
    private readonly flagRepo: Repository<FeatureFlagEntity>,
    @InjectRepository(EnvironmentProfileEntity, 'k4_connection')
    private readonly envRepo: Repository<EnvironmentProfileEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // === Configuration Management ===

  async getConfig(
    tenantId: string,
    moduleId: string,
    key: string,
    environment: string = 'production',
  ): Promise<ConfigurationEntity | null> {
    return this.configRepo.findOne({
      where: { tenantId, moduleId, key, environment },
    });
  }

  async getModuleConfigs(
    tenantId: string,
    moduleId: string,
    environment: string = 'production',
  ): Promise<ConfigurationEntity[]> {
    return this.configRepo.find({
      where: { tenantId, moduleId, environment },
      order: { key: 'ASC' },
    });
  }

  async setConfig(
    tenantId: string,
    userId: string,
    dto: SetConfigDto,
  ): Promise<ConfigurationEntity> {
    const existing = await this.configRepo.findOne({
      where: {
        tenantId,
        moduleId: dto.moduleId,
        key: dto.key,
        environment: dto.environment || 'production',
      },
    });

    let config: ConfigurationEntity;
    let oldValue = '';

    if (existing) {
      oldValue = existing.value;
      existing.value = dto.value;
      existing.valueType = dto.valueType || existing.valueType;
      existing.encrypted = dto.encrypted ?? existing.encrypted;
      existing.description = dto.description ?? existing.description;
      existing.updatedBy = userId;
      config = await this.configRepo.save(existing);
    } else {
      const newConfig = this.configRepo.create({
        tenantId,
        moduleId: dto.moduleId,
        key: dto.key,
        value: dto.value,
        valueType: dto.valueType || 'string',
        environment: dto.environment || 'production',
        encrypted: dto.encrypted || false,
        source: 'override',
        description: dto.description,
        createdBy: userId,
        updatedBy: userId,
      });
      config = await this.configRepo.save(newConfig);
    }

    // P-017: Audit — emit config changed event
    this.safeEmit(
      ConfigChangedEvent.eventType,
      new ConfigChangedEvent(
        dto.moduleId, dto.key, oldValue, dto.value,
        dto.environment || 'production', tenantId,
      ),
    );

    this.logger.log(`Config updated: ${dto.moduleId}/${dto.key} [tenant: ${tenantId}]`);
    return config;
  }

  async deleteConfig(
    tenantId: string,
    moduleId: string,
    key: string,
    environment: string = 'production',
  ): Promise<void> {
    const result = await this.configRepo.delete({
      tenantId, moduleId, key, environment,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Config not found: ${moduleId}/${key}`);
    }
  }

  // === Feature Flag Management ===

  async getFeatureFlag(
    tenantId: string,
    name: string,
  ): Promise<FeatureFlagEntity | null> {
    return this.flagRepo.findOne({ where: { tenantId, name } });
  }

  async isFeatureEnabled(
    tenantId: string,
    name: string,
  ): Promise<boolean> {
    const flag = await this.flagRepo.findOne({ where: { tenantId, name } });
    if (!flag) return false;

    // Check tenant-specific override
    if (flag.tenantOverrides[tenantId] !== undefined) {
      return flag.tenantOverrides[tenantId];
    }

    // Check rollout percentage
    if (flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100) {
      const hash = this.hashTenantFlag(tenantId, name);
      return hash % 100 < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  async createFeatureFlag(
    tenantId: string,
    userId: string,
    dto: CreateFeatureFlagDto,
  ): Promise<FeatureFlagEntity> {
    const existing = await this.flagRepo.findOne({
      where: { tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Feature flag '${dto.name}' already exists`);
    }

    const flag = this.flagRepo.create({
      tenantId,
      name: dto.name,
      moduleId: dto.moduleId,
      enabled: dto.enabled || false,
      rolloutPercentage: dto.rolloutPercentage || 0,
      description: dto.description,
      tenantOverrides: {},
      createdBy: userId,
      updatedBy: userId,
    });

    return this.flagRepo.save(flag);
  }

  async toggleFeatureFlag(
    tenantId: string,
    userId: string,
    name: string,
    dto: ToggleFeatureFlagDto,
  ): Promise<FeatureFlagEntity> {
    const flag = await this.flagRepo.findOne({ where: { tenantId, name } });
    if (!flag) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }

    flag.enabled = dto.enabled;
    flag.updatedBy = userId;
    const updated = await this.flagRepo.save(flag);

    this.safeEmit(
      FeatureFlagToggledEvent.eventType,
      new FeatureFlagToggledEvent(name, dto.enabled, flag.moduleId, tenantId),
    );

    return updated;
  }

  async listFeatureFlags(
    tenantId: string,
    moduleId?: string,
  ): Promise<FeatureFlagEntity[]> {
    const where: Record<string, string> = { tenantId };
    if (moduleId) where['moduleId'] = moduleId;
    return this.flagRepo.find({ where, order: { name: 'ASC' } });
  }

  // === Environment Profiles ===

  async getEnvironment(
    tenantId: string,
    name: string,
  ): Promise<EnvironmentProfileEntity | null> {
    return this.envRepo.findOne({ where: { tenantId, name } });
  }

  async listEnvironments(
    tenantId: string,
  ): Promise<EnvironmentProfileEntity[]> {
    return this.envRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  // === Utility ===
  private hashTenantFlag(tenantId: string, flagName: string): number {
    const str = `${tenantId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
