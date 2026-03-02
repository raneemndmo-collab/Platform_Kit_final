// =============================================================================
// D13: Visual Drift Detection — Conversion Fidelity Validation
// Constitutional Reference: Part 23, Cluster: DPC
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DriftAnalysis {
  cdrId: string;
  overallScore: number;
  layerScores: Record<string, number>;
  driftAreas: DriftArea[];
  acceptable: boolean;
}

export interface DriftArea {
  elementId: string;
  layer: string;
  driftType: 'position' | 'color' | 'font' | 'size' | 'missing' | 'extra';
  severity: number;
  description: string;
  sourceBounds?: { x: number; y: number; width: number; height: number };
  targetBounds?: { x: number; y: number; width: number; height: number };
}

@Injectable()
export class VisualDriftService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(VisualDriftService.name);
  private readonly ACCEPTABLE_THRESHOLD = 0.90;

  constructor(
    @InjectRepository('DriftAnalysisEntity') private driftRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async analyzeDrift(tenantId: string, dto: {
    cdrId: string; sourceCdr: unknown; targetCdr: unknown;
  }): Promise<DriftAnalysis> {
    const startTime = Date.now();
    const layerScores: Record<string, number> = {};
    const driftAreas: DriftArea[] = [];

    const layers = ['structure', 'content', 'layout', 'style', 'media', 'interaction', 'metadata'];
    for (const layer of layers) {
      const sourceLayer = dto.sourceCdr?.[layer] || {};
      const targetLayer = dto.targetCdr?.[layer] || {};
      const { score, areas } = this.compareLayer(layer, sourceLayer, targetLayer);
      layerScores[layer] = score;
      driftAreas.push(...areas);
    }

    const overallScore = Object.values(layerScores).reduce((a, b) => a + b, 0) / layers.length;
    const acceptable = overallScore >= this.ACCEPTABLE_THRESHOLD;

    const analysis: DriftAnalysis = { cdrId: dto.cdrId, overallScore, layerScores, driftAreas, acceptable };

    await this.driftRepo.save({
      tenantId, cdrId: dto.cdrId, analysisJson: JSON.stringify(analysis),
      overallScore, acceptable, driftCount: driftAreas.length,
      durationMs: Date.now() - startTime,
    });

    if (!acceptable) {
      this.safeEmit('drift.detected', {
        tenantId, cdrId: dto.cdrId, driftScore: overallScore,
        driftCount: driftAreas.length,
      });
    }

    return analysis;
  }

  private compareLayer(layer: string, source: unknown, target: unknown): { score: number; areas: DriftArea[] } {
    const areas: DriftArea[] = [];
    let score = 1.0;

    const sourceKeys = Object.keys(source);
    const targetKeys = Object.keys(target);

    // Check missing elements
    for (const key of sourceKeys) {
      if (!targetKeys.includes(key)) {
        areas.push({ elementId: key, layer, driftType: 'missing', severity: 0.8, description: `Element ${key} missing in target` });
        score -= 0.1;
      }
    }

    // Check extra elements
    for (const key of targetKeys) {
      if (!sourceKeys.includes(key)) {
        areas.push({ elementId: key, layer, driftType: 'extra', severity: 0.3, description: `Extra element ${key} in target` });
        score -= 0.02;
      }
    }

    // Deep comparison for shared keys
    for (const key of sourceKeys.filter(k => targetKeys.includes(k))) {
      if (JSON.stringify(source[key]) !== JSON.stringify(target[key])) {
        const severity = layer === 'content' ? 0.9 : layer === 'layout' ? 0.7 : 0.4;
        areas.push({ elementId: key, layer, driftType: 'size', severity, description: `${key} differs between source and target` });
        score -= severity * 0.05;
      }
    }

    return { score: Math.max(0, Math.min(1, score)), areas };
  }

  async getDriftHistory(tenantId: string, cdrId: string): Promise<DriftAnalysis[]> {
    const records = await this.driftRepo.find({ where: { tenantId, cdrId }, order: { createdAt: 'DESC' } });
    return records.map(r => JSON.parse(r.analysisJson));
  }
}