// =============================================================================
// D3: Visual Semantic Module — AI-based Visual Classification
// Constitutional Reference: Part 12, Cluster: DPC-GPU
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum VisualElementType {
  PHOTOGRAPH = 'photograph', CHART_BAR = 'chart_bar', CHART_LINE = 'chart_line',
  CHART_PIE = 'chart_pie', DIAGRAM_FLOW = 'diagram_flow', DIAGRAM_ORG = 'diagram_org',
  TABLE_IMAGE = 'table_image', ICON = 'icon', LOGO = 'logo', SIGNATURE = 'signature',
  MAP = 'map', INFOGRAPHIC = 'infographic', DECORATIVE = 'decorative',
}

export interface VisualClassification {
  elementId: string;
  type: VisualElementType;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  semanticRole: 'primary' | 'supporting' | 'decorative' | 'functional';
  altTextSuggestion: string;
  dataExtractable: boolean;
  extractedData?: unknown;
}

@Injectable()
export class VisualSemanticService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(VisualSemanticService.name);
  private readonly CONFIDENCE_THRESHOLD = 0.75;

  constructor(
    @InjectRepository('VisualClassificationEntity') private classRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async classifyVisuals(tenantId: string, dto: { cdrId: string; mediaLayer: unknown }): Promise<VisualClassification[]> {
    const startTime = Date.now();
    const elements = dto.mediaLayer?.images || [];
    const classifications: VisualClassification[] = [];

    for (const element of elements) {
      const classification = this.classifySingleElement(element);
      classifications.push(classification);
    }

    await this.classRepo.save({
      tenantId, cdrId: dto.cdrId,
      classificationsJson: JSON.stringify(classifications),
      elementCount: classifications.length,
      avgConfidence: classifications.length > 0
        ? classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length : 0,
    });

    this.safeEmit('visual.classified', {
      tenantId, cdrId: dto.cdrId, elementCount: classifications.length,
      durationMs: Date.now() - startTime,
    });

    return classifications;
  }

  private classifySingleElement(element: unknown): VisualClassification {
    let type = VisualElementType.PHOTOGRAPH;
    let confidence = 0.6;
    let semanticRole: VisualClassification['semanticRole'] = 'supporting';
    let dataExtractable = false;

    if (element.mimeType?.includes('svg') || element.vectorData) {
      type = VisualElementType.DIAGRAM_FLOW; confidence = 0.85; semanticRole = 'primary';
    } else if ((element.width || 100) < 64 && (element.height || 100) < 64) {
      type = VisualElementType.ICON; confidence = 0.9; semanticRole = 'decorative';
    } else if (element.metadata?.chartType) {
      const ct = element.metadata.chartType;
      type = ct === 'bar' ? VisualElementType.CHART_BAR : ct === 'line' ? VisualElementType.CHART_LINE : VisualElementType.CHART_PIE;
      confidence = 0.95; semanticRole = 'primary'; dataExtractable = true;
    } else if (element.metadata?.isLogo) {
      type = VisualElementType.LOGO; confidence = 0.92; semanticRole = 'functional';
    }

    return {
      elementId: element.id || crypto.randomUUID(),
      type, confidence,
      boundingBox: { x: element.x || 0, y: element.y || 0, width: element.width || 100, height: element.height || 100 },
      semanticRole, dataExtractable,
      altTextSuggestion: this.generateAltText(type, element),
      extractedData: dataExtractable ? element.metadata?.data : undefined,
    };
  }

  private generateAltText(type: VisualElementType, element: unknown): string {
    const descriptions: Record<string, string> = {
      [VisualElementType.CHART_BAR]: 'Bar chart showing data comparison',
      [VisualElementType.CHART_LINE]: 'Line chart showing trend data',
      [VisualElementType.CHART_PIE]: 'Pie chart showing distribution',
      [VisualElementType.DIAGRAM_FLOW]: 'Flow diagram illustrating process',
      [VisualElementType.LOGO]: 'Organization logo',
      [VisualElementType.ICON]: 'Decorative icon',
      [VisualElementType.PHOTOGRAPH]: 'Photograph',
    };
    return element.altText || descriptions[type] || `Visual element of type ${type}`;
  }

  async getClassifications(tenantId: string, cdrId: string): Promise<VisualClassification[]> {
    const record = await this.classRepo.findOne({ where: { tenantId, cdrId } });
    return record ? JSON.parse(record.classificationsJson) : [];
  }
}