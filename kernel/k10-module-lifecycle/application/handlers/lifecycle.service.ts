// =============================================================================
import { BoundedMap } from '../../../../shared/bounded-collections';
// K10: Module Lifecycle Service
// Constitutional Reference: K10 Contract, DGV-002, DEP-003, DEP-004
// DAG validation: no cycles, depth ≤3
// =============================================================================

import {
  Injectable, Logger, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ModuleRegistryEntity, DependencyEdgeEntity, ModuleVersionEntity,
} from '../../domain/entities';

@Injectable()
export class K10LifecycleService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K10LifecycleService.name);

  constructor(
    @InjectRepository(ModuleRegistryEntity, 'k10_connection') private registryRepo: Repository<ModuleRegistryEntity>,
    @InjectRepository(DependencyEdgeEntity, 'k10_connection') private depRepo: Repository<DependencyEdgeEntity>,
    @InjectRepository(ModuleVersionEntity, 'k10_connection') private versionRepo: Repository<ModuleVersionEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Module Registration ────────────────────────────────────────
  async register(tenantId: string, dto: {
    moduleId: string; name: string; tier: string; version: string;
    description?: string; ownerTeam?: string; databaseName: string;
    apiBasePath: string; eventNamespaces?: string[];
    exposedPermissions?: string[]; manifest?: Record<string, unknown>;
    phase?: number;
  }): Promise<ModuleRegistryEntity> {
    const existing = await this.registryRepo.findOne({
      where: { tenantId, moduleId: dto.moduleId },
    });
    if (existing) throw new ConflictException(`Module '${dto.moduleId}' already registered`);

    // Validate manifest completeness
    this.validateManifest(dto);

    const module = this.registryRepo.create({
      tenantId, ...dto, status: 'registered',
      eventNamespaces: dto.eventNamespaces || [],
      exposedPermissions: dto.exposedPermissions || [],
      manifest: dto.manifest || {},
    });
    const saved = await this.registryRepo.save(module);

    this.safeEmit('lifecycle.module.registered', {
      tenantId, moduleId: dto.moduleId, tier: dto.tier,
    });

    return saved;
  }

  private validateManifest(dto: Record<string, unknown>): void {
    const required = ['moduleId', 'name', 'tier', 'version', 'databaseName', 'apiBasePath'];
    for (const field of required) {
      if (!dto[field]) {
        throw new BadRequestException(`Manifest validation failed: missing '${field}'`);
      }
    }
  }

  async getModules(tenantId: string, tier?: string): Promise<ModuleRegistryEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (tier) where.tier = tier;
    return this.registryRepo.find({ where, order: { moduleId: 'ASC' } });
  }

  async getModule(tenantId: string, moduleId: string): Promise<ModuleRegistryEntity> {
    const module = await this.registryRepo.findOne({ where: { tenantId, moduleId } });
    if (!module) throw new NotFoundException(`Module '${moduleId}' not found`);
    return module;
  }

  async updateStatus(tenantId: string, moduleId: string, status: string): Promise<ModuleRegistryEntity> {
    const module = await this.getModule(tenantId, moduleId);
    if (module.isFrozen && status !== 'frozen') {
      throw new BadRequestException(`Module '${moduleId}' is frozen (P-010)`);
    }
    module.status = status;
    return this.registryRepo.save(module);
  }

  // ─── Module Freeze (P-010, FRZ-001) ────────────────────────────
  async freezeModule(tenantId: string, moduleId: string, frozenBy: string): Promise<ModuleRegistryEntity> {
    const module = await this.getModule(tenantId, moduleId);
    if (module.isFrozen) throw new ConflictException(`Module '${moduleId}' already frozen`);

    module.isFrozen = true;
    module.frozenAt = new Date();
    module.frozenBy = frozenBy;
    module.status = 'frozen';
    const saved = await this.registryRepo.save(module);

    this.safeEmit('lifecycle.module.frozen', {
      tenantId, moduleId, frozenBy, frozenAt: module.frozenAt,
    });

    this.logger.warn(`Module ${moduleId} FROZEN by ${frozenBy}. No modifications without Constitutional Amendment.`);
    return saved;
  }

  // ─── Dependency Graph ───────────────────────────────────────────
  async addDependency(tenantId: string, dto: {
    sourceModule: string; targetModule: string;
    dependencyType?: string; contractVersion?: string;
  }): Promise<DependencyEdgeEntity> {
    // Cannot depend on self
    if (dto.sourceModule === dto.targetModule) {
      throw new BadRequestException('Module cannot depend on itself');
    }

    const existing = await this.depRepo.findOne({
      where: { tenantId, sourceModule: dto.sourceModule, targetModule: dto.targetModule },
    });
    if (existing) throw new ConflictException('Dependency already exists');

    const edge = this.depRepo.create({ tenantId, ...dto });
    const saved = await this.depRepo.save(edge);

    // Validate graph after adding (DEP-003, DGV-002)
    const validation = await this.validateGraph(tenantId);
    if (!validation.valid) {
      // Rollback
      await this.depRepo.delete(saved.id);
      throw new BadRequestException(
        `Dependency rejected: ${validation.errors.join('; ')}`
      );
    }

    return saved;
  }

  async getDependencyGraph(tenantId: string): Promise<{
    modules: ModuleRegistryEntity[];
    edges: DependencyEdgeEntity[];
  }> {
    const modules = await this.registryRepo.find({ where: { tenantId } });
    const edges = await this.depRepo.find({ where: { tenantId } });
    return { modules, edges };
  }

  // ─── Graph Validation (DEP-003: no cycles, DEP-004: depth ≤3) ──
  async validateGraph(tenantId: string): Promise<{
    valid: boolean; errors: string[];
    maxDepth: number; hasCycles: boolean;
  }> {
    const edges = await this.depRepo.find({ where: { tenantId } });
    const errors: string[] = [];

    // Build adjacency list
    const graph = new BoundedMap<string, string[]>(10_000);
    for (const edge of edges) {
      if (!graph.has(edge.sourceModule)) graph.set(edge.sourceModule, []);
      graph.get(edge.sourceModule).push(edge.targetModule);
    }

    // DEP-003: Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let hasCycles = false;

    const detectCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      for (const neighbor of (graph.get(node) || [])) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          errors.push(`DEP-003: Circular dependency detected: ${node} → ${neighbor}`);
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (detectCycle(node)) {
          hasCycles = true;
          break;
        }
      }
    }

    // DEP-004: Check max depth ≤ 3
    let maxDepth = 0;
    const getDepth = (node: string, depth: number, seen: Set<string>): number => {
      if (seen.has(node)) return depth; // Avoid infinite loops
      seen.add(node);
      let max = depth;
      for (const neighbor of (graph.get(node) || [])) {
        max = Math.max(max, getDepth(neighbor, depth + 1, new Set(seen)));
      }
      return max;
    };

    for (const node of graph.keys()) {
      const depth = getDepth(node, 0, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    if (maxDepth > 3) {
      errors.push(`DEP-004: Dependency depth ${maxDepth} exceeds maximum of 3`);
    }

    return {
      valid: errors.length === 0,
      errors,
      maxDepth,
      hasCycles,
    };
  }

  // ─── Version Management ─────────────────────────────────────────
  async registerVersion(tenantId: string, dto: {
    moduleId: string; version: string; changelog?: string;
    breakingChanges?: string[]; releasedBy: string;
  }): Promise<ModuleVersionEntity> {
    const module = await this.getModule(tenantId, dto.moduleId);
    if (module.isFrozen) {
      throw new BadRequestException(`Module '${dto.moduleId}' is frozen (P-010)`);
    }

    const ver = this.versionRepo.create({
      tenantId, ...dto, releasedAt: new Date(), isActive: true,
    });
    return this.versionRepo.save(ver);
  }

  async getVersions(tenantId: string, moduleId: string): Promise<ModuleVersionEntity[]> {
    return this.versionRepo.find({
      where: { tenantId, moduleId }, order: { createdAt: 'DESC' },
    });
  }

  // ─── Health ────────────────────────────────────────────────────
  async getHealth(tenantId?: string): Promise<{
    status: string; module: string; registeredModules?: number;
  }> {
    let registeredModules = 0;
    if (tenantId) {
      registeredModules = await this.registryRepo.count({ where: { tenantId } });
    }
    return { status: 'healthy', module: 'K10-ModuleLifecycle', registeredModules };
  }
}
