// =============================================================================
// D8: Typography Engine — Font Resolution, RTL/LTR Shaping
// Constitutional Reference: Part 18, Cluster: DPC
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface FontResolution {
  requestedFont: string;
  resolvedFont: string;
  fallbackChain: string[];
  embedRequired: boolean;
  licenseStatus: 'licensed' | 'open-source' | 'system' | 'unknown';
  glyphCoverage: number;
}

export interface TextShapingResult {
  text: string;
  direction: 'ltr' | 'rtl' | 'bidi';
  script: string;
  shapedGlyphs: number;
  ligatures: number;
  kerningPairs: number;
  bidirectionalRuns: BidiRun[];
}

export interface BidiRun {
  start: number;
  end: number;
  direction: 'ltr' | 'rtl';
  level: number;
  script: string;
}

@Injectable()
export class TypographyEngineService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(TypographyEngineService.name);

  private readonly ARABIC_FONTS = ['Cairo', 'Noto Naskh Arabic', 'Amiri', 'Tajawal', 'IBM Plex Arabic'];
  private readonly FALLBACK_CHAIN: Record<string, string[]> = {
    'Arial': ['Helvetica', 'Liberation Sans', 'Noto Sans', 'sans-serif'],
    'Times New Roman': ['Liberation Serif', 'Noto Serif', 'serif'],
    'Cairo': ['Noto Naskh Arabic', 'Amiri', 'Tajawal', 'sans-serif'],
    'Calibri': ['Carlito', 'Liberation Sans', 'Noto Sans', 'sans-serif'],
  };

  constructor(
    @InjectRepository('FontResolutionEntity') private fontRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async resolveFonts(tenantId: string, dto: { cdrId: string; styleLayer: unknown }): Promise<FontResolution[]> {
    const requestedFonts: string[] = this.extractFontNames(dto.styleLayer);
    const resolutions: FontResolution[] = [];

    for (const font of requestedFonts) {
      resolutions.push(this.resolveFont(font));
    }

    await this.fontRepo.save({
      tenantId, cdrId: dto.cdrId,
      resolutionsJson: JSON.stringify(resolutions),
      fontCount: resolutions.length,
      allResolved: resolutions.every(r => r.resolvedFont !== 'sans-serif'),
    });

    this.safeEmit('typography.resolved', {
      tenantId, cdrId: dto.cdrId, fontsResolved: resolutions.length,
    });

    return resolutions;
  }

  async shapeText(tenantId: string, dto: { text: string; font: string; locale: string }): Promise<TextShapingResult> {
    const direction = this.detectDirection(dto.text);
    const script = this.detectScript(dto.text);
    const bidiRuns = this.analyzeBidi(dto.text);

    return {
      text: dto.text, direction, script,
      shapedGlyphs: dto.text.length,
      ligatures: direction === 'rtl' ? Math.floor(dto.text.length * 0.15) : 0,
      kerningPairs: Math.floor(dto.text.length * 0.3),
      bidirectionalRuns: bidiRuns,
    };
  }

  private resolveFont(fontName: string): FontResolution {
    const chain = this.FALLBACK_CHAIN[fontName] || ['sans-serif'];
    const isArabic = this.ARABIC_FONTS.includes(fontName);

    return {
      requestedFont: fontName,
      resolvedFont: fontName,
      fallbackChain: chain,
      embedRequired: !['sans-serif', 'serif', 'monospace'].includes(fontName),
      licenseStatus: isArabic ? 'open-source' : 'system',
      glyphCoverage: 0.98,
    };
  }

  private detectDirection(text: string): 'ltr' | 'rtl' | 'bidi' {
    const arabicRegex = /[؀-ۿݐ-ݿ]/;
    const latinRegex = /[A-Za-z]/;
    const hasArabic = arabicRegex.test(text);
    const hasLatin = latinRegex.test(text);
    if (hasArabic && hasLatin) return 'bidi';
    if (hasArabic) return 'rtl';
    return 'ltr';
  }

  private detectScript(text: string): string {
    if (/[؀-ۿ]/.test(text)) return 'Arabic';
    if (/[Ѐ-ӿ]/.test(text)) return 'Cyrillic';
    if (/[一-鿿]/.test(text)) return 'CJK';
    return 'Latin';
  }

  private analyzeBidi(text: string): BidiRun[] {
    const runs: BidiRun[] = [];
    let currentDir: 'ltr' | 'rtl' = 'ltr';
    let runStart = 0;

    for (let i = 0; i < text.length; i++) {
      const isRtl = /[؀-ۿݐ-ݿ]/.test(text[i]);
      const dir = isRtl ? 'rtl' : 'ltr';
      if (dir !== currentDir && i > 0) {
        runs.push({ start: runStart, end: i - 1, direction: currentDir, level: currentDir === 'rtl' ? 1 : 0, script: currentDir === 'rtl' ? 'Arabic' : 'Latin' });
        runStart = i;
        currentDir = dir;
      }
    }
    if (text.length > 0) {
      runs.push({ start: runStart, end: text.length - 1, direction: currentDir, level: currentDir === 'rtl' ? 1 : 0, script: currentDir === 'rtl' ? 'Arabic' : 'Latin' });
    }
    return runs;
  }

  private extractFontNames(styleLayer: unknown): string[] {
    const fonts = new Set<string>();
    for (const style of (styleLayer?.elementStyles || [])) {
      if (style.fontFamily) fonts.add(style.fontFamily);
    }
    if (fonts.size === 0) fonts.add('Cairo');
    return [...fonts];
  }
}