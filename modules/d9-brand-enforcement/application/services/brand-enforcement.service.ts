// =============================================================================
// D9: Brand Enforcement — Brand Guideline Compliance
// Constitutional Reference: Part 19, Cluster: DPC
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface BrandGuideline {
  id: string;
  tenantId: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string; forbidden: string[] };
  fonts: { heading: string; body: string; allowedFonts: string[]; forbiddenFonts: string[] };
  logos: { primary: string; variations: string[]; minSize: number; clearSpace: number };
  spacing: { minMargin: number; minLineHeight: number };
}

export interface BrandCheckResult {
  compliant: boolean;
  score: number;
  violations: BrandViolation[];
  suggestions: string[];
}

export interface BrandViolation {
  rule: string;
  severity: 'error' | 'warning';
  element: string;
  expected: string;
  actual: string;
}

@Injectable()
export class BrandEnforcementService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(BrandEnforcementService.name);

  constructor(
    @InjectRepository('BrandGuidelineEntity') private guidelineRepo: Repository<unknown>,
    @InjectRepository('BrandCheckEntity') private checkRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async checkCompliance(tenantId: string, dto: { cdrId: string; styleLayer: unknown; mediaLayer: unknown }): Promise<BrandCheckResult> {
    const guideline = await this.getGuideline(tenantId);
    if (!guideline) return { compliant: true, score: 1.0, violations: [], suggestions: ['No brand guideline configured'] };

    const violations: BrandViolation[] = [];

    // Check colors
    const usedColors = this.extractColors(dto.styleLayer);
    for (const color of usedColors) {
      if (guideline.colors.forbidden.includes(color.toLowerCase())) {
        violations.push({ rule: 'color-restriction', severity: 'error', element: 'style', expected: 'Non-forbidden color', actual: color });
      }
    }

    // Check fonts
    const usedFonts = this.extractFonts(dto.styleLayer);
    for (const font of usedFonts) {
      if (guideline.fonts.forbiddenFonts.includes(font)) {
        violations.push({ rule: 'font-restriction', severity: 'error', element: 'typography', expected: `One of: ${guideline.fonts.allowedFonts.join(', ')}`, actual: font });
      }
    }

    // Check logo usage
    const logos = dto.mediaLayer?.images?.filter((i: unknown) => i.metadata?.isLogo) || [];
    for (const logo of logos) {
      if (logo.width < guideline.logos.minSize || logo.height < guideline.logos.minSize) {
        violations.push({ rule: 'logo-min-size', severity: 'warning', element: logo.id, expected: `Min ${guideline.logos.minSize}px`, actual: `${logo.width}x${logo.height}` });
      }
    }

    const score = Math.max(0, 1 - (violations.reduce((___c, v) => (v.severity === 'error') ? ___c + 1 : ___c, 0) * 0.2 + violations.reduce((___c, v) => (v.severity === 'warning') ? ___c + 1 : ___c, 0) * 0.05));
    const result: BrandCheckResult = { compliant: violations.reduce((___c, v) => (v.severity === 'error') ? ___c + 1 : ___c, 0) === 0, score, violations, suggestions: [] };

    await this.checkRepo.save({ tenantId, cdrId: dto.cdrId, resultJson: JSON.stringify(result), score, compliant: result.compliant });
    return result;
  }

  async setGuideline(tenantId: string, guideline: Omit<BrandGuideline, 'id' | 'tenantId'>): Promise<BrandGuideline> {
    const existing = await this.guidelineRepo.findOne({ where: { tenantId } });
    if (existing) {
      Object.assign(existing, guideline);
      return this.guidelineRepo.save(existing);
    }
    return this.guidelineRepo.save({ tenantId, ...guideline });
  }

  async getGuideline(tenantId: string): Promise<BrandGuideline | null> {
    return this.guidelineRepo.findOne({ where: { tenantId } });
  }

  private extractColors(styleLayer: unknown): string[] {
    const colors = new Set<string>();
    for (const style of (styleLayer?.elementStyles || [])) {
      if (style.color) colors.add(style.color);
      if (style.backgroundColor) colors.add(style.backgroundColor);
    }
    return [...colors];
  }

  private extractFonts(styleLayer: unknown): string[] {
    const fonts = new Set<string>();
    for (const style of (styleLayer?.elementStyles || [])) {
      if (style.fontFamily) fonts.add(style.fontFamily);
    }
    return [...fonts];
  }
}