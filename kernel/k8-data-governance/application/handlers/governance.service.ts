// =============================================================================
// K8: Data Governance Service
// Constitutional Reference: K8 Contract, P-003
// Data classification, retention policies, schema validation
// =============================================================================

import {
  Injectable, Logger, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DataClassificationEntity, RetentionPolicyEntity, SchemaValidationEntity,
} from '../../domain/entities';

@Injectable()
export class K8GovernanceService {
  private readonly logger = new Logger(K8GovernanceService.name);

  constructor(
    @InjectRepository(DataClassificationEntity, 'k8_connection') private classRepo: Repository<DataClassificationEntity>,
    @InjectRepository(RetentionPolicyEntity, 'k8_connection') private retentionRepo: Repository<RetentionPolicyEntity>,
    @InjectRepository(SchemaValidationEntity, 'k8_connection') private schemaRepo: Repository<SchemaValidationEntity>,
  ) {}

  // ─── Data Classification ────────────────────────────────────────
  async classify(tenantId: string, classifiedBy: string, dto: {
    moduleId: string; entityName: string; fieldPath: string;
    classification: string; isPII?: boolean; isFinancial?: boolean;
    encryptionRequired?: boolean; maskingPattern?: string;
  }): Promise<DataClassificationEntity> {
    const existing = await this.classRepo.findOne({
      where: { tenantId, moduleId: dto.moduleId, fieldPath: dto.fieldPath },
    });

    if (existing) {
      Object.assign(existing, dto, { classifiedBy });
      return this.classRepo.save(existing);
    }

    const entity = this.classRepo.create({ tenantId, classifiedBy, ...dto });
    return this.classRepo.save(entity);
  }

  async getClassifications(tenantId: string, moduleId?: string): Promise<DataClassificationEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (moduleId) where.moduleId = moduleId;
    return this.classRepo.find({ where });
  }

  async getPIIFields(tenantId: string): Promise<DataClassificationEntity[]> {
    return this.classRepo.find({ where: { tenantId, isPII: true } });
  }

  // ─── Retention Policies ─────────────────────────────────────────
  async setRetentionPolicy(tenantId: string, dto: {
    moduleId: string; entityName: string; retentionDays: number;
    archiveStrategy: string; archiveLocation?: string;
  }): Promise<RetentionPolicyEntity> {
    let policy = await this.retentionRepo.findOne({
      where: { tenantId, moduleId: dto.moduleId, entityName: dto.entityName },
    });

    if (policy) {
      Object.assign(policy, dto);
    } else {
      policy = this.retentionRepo.create({ tenantId, ...dto, isActive: true });
    }
    return this.retentionRepo.save(policy);
  }

  async getRetentionPolicies(tenantId: string, moduleId?: string): Promise<RetentionPolicyEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (moduleId) where.moduleId = moduleId;
    return this.retentionRepo.find({ where });
  }

  async setLegalHold(tenantId: string, moduleId: string, entityName: string, hold: {
    enabled: boolean; reason?: string; until?: string;
  }): Promise<RetentionPolicyEntity> {
    const policy = await this.retentionRepo.findOne({
      where: { tenantId, moduleId, entityName },
    });
    if (!policy) throw new NotFoundException('Retention policy not found');
    policy.legalHold = hold;
    return this.retentionRepo.save(policy);
  }

  // ─── Schema Validation ──────────────────────────────────────────
  async registerSchema(tenantId: string, validatedBy: string, dto: {
    moduleId: string; schemaName: string; version: number;
    jsonSchema: Record<string, unknown>;
  }): Promise<SchemaValidationEntity> {
    // Check backward compatibility
    const previous = await this.schemaRepo.findOne({
      where: { tenantId, moduleId: dto.moduleId, schemaName: dto.schemaName },
      order: { version: 'DESC' },
    });

    let isBackwardCompatible = true;
    let breakingChanges: string[] = [];

    if (previous) {
      const result = this.checkBackwardCompatibility(previous.jsonSchema, dto.jsonSchema);
      isBackwardCompatible = result.compatible;
      breakingChanges = result.changes;
    }

    const schema = this.schemaRepo.create({
      tenantId, validatedBy, ...dto,
      isBackwardCompatible, breakingChanges,
      previousVersion: previous?.version || null,
    });
    return this.schemaRepo.save(schema);
  }

  async getSchemas(tenantId: string, moduleId?: string): Promise<SchemaValidationEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (moduleId) where.moduleId = moduleId;
    return this.schemaRepo.find({ where, order: { version: 'DESC' } });
  }

  private checkBackwardCompatibility(
    oldSchema: Record<string, unknown>, newSchema: Record<string, unknown>,
  ): { compatible: boolean; changes: string[] } {
    const changes: string[] = [];

    // Check for removed required fields
    const oldRequired = oldSchema.required || [];
    const newRequired = newSchema.required || [];
    for (const field of oldRequired) {
      if (!newRequired.includes(field)) {
        changes.push(`Removed required field: ${field}`);
      }
    }

    // Check for removed properties
    const oldProps = Object.keys(oldSchema.properties || {});
    const newProps = Object.keys(newSchema.properties || {});
    for (const prop of oldProps) {
      if (!newProps.includes(prop)) {
        changes.push(`Removed property: ${prop}`);
      }
    }

    return { compatible: changes.length === 0, changes };
  }

  // ─── Health ────────────────────────────────────────────────────
  getHealth(): { status: string; module: string } {
    return { status: 'healthy', module: 'K8-DataGovernance' };
  }
}
