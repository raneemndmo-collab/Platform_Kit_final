// =============================================================================
import { BoundedMap } from '../bounded-collections';
// Rasid Platform v6.2 — Plugin & Extension SDK
// Constitutional Reference: Part 36 (PLG-001 — PLG-007)
// Plugin types, sandbox isolation, security review
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

export enum PluginType {
  DATA_TRANSFORMER = 'data_transformer',
  NOTIFICATION_CHANNEL = 'notification_channel',
  REPORT_GENERATOR = 'report_generator',
  AI_MODEL_ADAPTER = 'ai_model_adapter',
  INTEGRATION_CONNECTOR = 'integration_connector',
  UI_WIDGET = 'ui_widget',
}

export enum PluginStatus { DRAFT = 'draft', REVIEW = 'review', APPROVED = 'approved', SUSPENDED = 'suspended' }

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  author: string;
  description: string;
  entryPoint: string;
  permissions: PluginPermission[];
  resourceLimits: ResourceLimits;
  tenantScoped: boolean;
}

export interface PluginPermission {
  resource: string;
  actions: ('read' | 'write' | 'execute')[];
}

export interface ResourceLimits {
  maxMemoryMB: number;      // PLG-004: Memory sandbox
  maxCpuPercent: number;
  maxExecutionMs: number;   // PLG-004: Timeout enforcement
  maxNetworkCalls: number;
  allowedDomains: string[]; // PLG-005: Network sandbox
}

export interface PluginContext {
  tenantId: string;
  pluginId: string;
  config: Record<string, unknown>;
}

/**
 * Base class for all plugins — PLG-002
 * Plugins MUST extend this and implement execute()
 */
export abstract class BasePlugin {
  abstract readonly manifest: PluginManifest;

  abstract execute(context: PluginContext, input: unknown): Promise<unknown>;

  async onInstall?(context: PluginContext): Promise<void>;
  async onUninstall?(context: PluginContext): Promise<void>;
  async healthCheck?(context: PluginContext): Promise<boolean>;
}

/**
 * Plugin Registry & Sandbox Manager — PLG-003, PLG-004
 */
@Injectable()
export class PluginRegistry {
  private readonly logger = new Logger(PluginRegistry.name);
  private plugins: Map<string, { manifest: PluginManifest; status: PluginStatus; instance?: BasePlugin }> = new BoundedMap<unknown, unknown>(10_000);

  register(manifest: PluginManifest): void {
    this.validateManifest(manifest);
    this.plugins.set(manifest.id, { manifest, status: PluginStatus.DRAFT });
    this.logger.log(`Plugin registered: ${manifest.id} v${manifest.version}`);
  }

  async executePlugin(pluginId: string, context: PluginContext, input: unknown): Promise<unknown> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
    if (plugin.status !== PluginStatus.APPROVED) throw new Error(`Plugin ${pluginId} not approved (status: ${plugin.status})`);
    if (!plugin.instance) throw new Error(`Plugin ${pluginId} not instantiated`);

    // PLG-004: Enforce execution timeout
    const timeout = plugin.manifest.resourceLimits.maxExecutionMs;
    return Promise.race([
      plugin.instance.execute(context, input),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Plugin ${pluginId} execution timeout (${timeout}ms)`)), timeout)),
    ]);
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) throw new Error('PLG-006: Invalid plugin manifest');
    if (!manifest.resourceLimits) throw new Error('PLG-004: Plugin must declare resource limits');
    if (manifest.resourceLimits.maxMemoryMB > 512) throw new Error('PLG-004: Plugin memory limit exceeds 512MB');
    if (manifest.resourceLimits.maxExecutionMs > 30000) throw new Error('PLG-004: Plugin timeout exceeds 30s');
  }

  getPlugin(id: string) { return this.plugins.get(id); }
  listPlugins(type?: PluginType) {
    const all = Array.from(this.plugins.values());
    return type ? all.filter(p => p.manifest.type === type) : all;
  }
  approvePlugin(id: string) { const p = this.plugins.get(id); if (p) p.status = PluginStatus.APPROVED; }
  suspendPlugin(id: string) { const p = this.plugins.get(id); if (p) p.status = PluginStatus.SUSPENDED; }
}
