// Rasid v6.4 — Version Reconciliation Engine — GAP-14 Fix
import { Injectable, Logger } from '@nestjs/common';

export interface VersionedConfig {
  version: string;
  hash: string;
  timestamp: Date;
  changes: string[];
  author: string;
}

export interface ReconciliationResult {
  compatible: boolean;
  conflicts: Array<{ field: string; v1Value: unknown; v2Value: unknown; resolution: string }>;
  mergedVersion?: string;
  warnings: string[];
}

@Injectable()
export class VersionReconciliationEngine {
  private readonly logger = new Logger(VersionReconciliationEngine.name);

  /**
   * GAP-14: Compare two constitutional document versions and identify conflicts
   */
  reconcile(v1: Record<string, any>, v2: Record<string, any>): ReconciliationResult {
    const conflicts: ReconciliationResult['conflicts'] = [];
    const warnings: string[] = [];
    const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);

    for (const key of allKeys) {
      if (!(key in v1)) {
        warnings.push(`New field '${key}' added in v2`);
        continue;
      }
      if (!(key in v2)) {
        warnings.push(`Field '${key}' removed in v2`);
        continue;
      }

      const val1 = JSON.stringify(v1[key]);
      const val2 = JSON.stringify(v2[key]);
      if (val1 !== val2) {
        conflicts.push({
          field: key,
          v1Value: v1[key],
          v2Value: v2[key],
          resolution: 'manual_review_required',
        });
      }
    }

    return {
      compatible: conflicts.length === 0,
      conflicts,
      mergedVersion: conflicts.length === 0 ? 'auto_merged' : undefined,
      warnings,
    };
  }

  /**
   * Check if a module version is compatible with platform version
   */
  checkCompatibility(platformVersion: string, moduleVersion: string): {
    compatible: boolean;
    reason: string;
  } {
    const [pMajor, pMinor] = platformVersion.split('.').map(Number);
    const [mMajor, mMinor] = moduleVersion.split('.').map(Number);

    if (mMajor !== pMajor) {
      return { compatible: false, reason: `Major version mismatch: platform ${pMajor}.x vs module ${mMajor}.x` };
    }
    if (mMinor > pMinor + 1) {
      return { compatible: false, reason: `Module too far ahead: platform ${platformVersion} vs module ${moduleVersion}` };
    }
    return { compatible: true, reason: 'Versions compatible' };
  }
}
