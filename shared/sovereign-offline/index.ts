// Rasid v6.4 — Sovereign Offline Package Mode — Part XXI
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger } from '@nestjs/common';

export interface OfflinePackage {
  id: string; tenantId: string; version: string;
  aiModelBundles: ModelBundle[]; lakehouseConfig: LakehouseConfig;
  semanticRegistry: Map<string, unknown>; renderingEngine: 'local';
  externalCalls: false;
}

export interface ModelBundle { modelId: string; type: string; sizeMb: number; version: string; checksum: string; }
export interface LakehouseConfig { storagePath: string; maxSizeGb: number; compressionEnabled: boolean; encryptionEnabled: boolean; }

@Injectable()
export class SovereignOfflineEngine {
  private readonly logger = new Logger(SovereignOfflineEngine.name);

  createPackage(tenantId: string, config: { models: string[]; storageSizeGb: number }): OfflinePackage {
    const bundles: ModelBundle[] = config.models.map(m => ({
      modelId: m, type: this.inferModelType(m), sizeMb: 500,
      version: '1.0.0', checksum: this.generateChecksum(m),
    }));

    return {
      id: `offline_${Date.now()}`, tenantId, version: '6.4.0',
      aiModelBundles: bundles,
      lakehouseConfig: { storagePath: `/sovereign/${tenantId}/lakehouse`, maxSizeGb: config.storageSizeGb, compressionEnabled: true, encryptionEnabled: true },
      semanticRegistry: new BoundedMap<unknown, unknown>(10_000), renderingEngine: 'local', externalCalls: false,
    };
  }

  validatePackage(pkg: OfflinePackage): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (pkg.aiModelBundles.length === 0) issues.push('No AI model bundles included');
    if (pkg.lakehouseConfig.maxSizeGb < 1) issues.push('Lakehouse storage too small');
    if (pkg.externalCalls !== false) issues.push('External calls must be disabled');
    if (pkg.renderingEngine !== 'local') issues.push('Rendering engine must be local');
    return { valid: issues.length === 0, issues };
  }

  private inferModelType(modelId: string): string {
    if (modelId.includes('ocr')) return 'ocr';
    if (modelId.includes('layout')) return 'layout_detection';
    if (modelId.includes('nlp')) return 'nlp';
    return 'general';
  }

  private generateChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) { hash = ((hash << 5) - hash) + input.charCodeAt(i); hash |= 0; }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

// C: Deterministic offline rendering
  configureDeterministicRendering(tenantId: string): { renderingMode: string; fontFallback: string; randomSeedFixed: boolean; layoutEngine: string } {
    return {
      renderingMode: 'deterministic_local',
      fontFallback: 'Noto Sans Arabic, Noto Sans, sans-serif',
      randomSeedFixed: true,
      layoutEngine: 'local_constraint_solver',
    };
  }

  // C: Localized semantic registry for offline operation
  buildLocalizedSemanticRegistry(tenantId: string, terms: Array<{ key: string; ar: string; en: string; category: string }>): Map<string, { ar: string; en: string; category: string }> {
    const registry = new BoundedMap<string, { ar: string; en: string; category: string }>(10_000);
    for (const term of terms) {
      registry.set(term.key, { ar: term.ar, en: term.en, category: term.category });
    }
    this.logger.log(`Built semantic registry for ${tenantId}: ${registry.size} terms`);
    return registry;
  }

  createFullOfflinePackage(tenantId: string, config: { models: string[]; storageSizeGb: number; semanticTerms: Array<{ key: string; ar: string; en: string; category: string }> }): OfflinePackage {
    const pkg = this.createPackage(tenantId, config);
    pkg.semanticRegistry = this.buildLocalizedSemanticRegistry(tenantId, config.semanticTerms || []);
    return pkg;
  }
}
