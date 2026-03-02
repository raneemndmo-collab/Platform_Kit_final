// =============================================================================
// D7: Interaction Engine — Links, Animations, Transitions
// Constitutional Reference: Part 17, Cluster: DPC
// FORBIDDEN: Business DB access (TXD-005), Non-deterministic ops (TXD-007)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export enum InteractionType { HYPERLINK = 'hyperlink', BOOKMARK = 'bookmark', ANIMATION = 'animation', TRANSITION = 'transition', FORM_FIELD = 'form_field', TOOLTIP = 'tooltip', TRIGGER = 'trigger' }

export interface InteractionElement {
  id: string;
  type: InteractionType;
  sourceElementId: string;
  targetRef?: string;
  config: Record<string, unknown>;
  preservable: boolean;
  fallback?: string;
}

export interface InteractionMap {
  elements: InteractionElement[];
  totalCount: number;
  preservableCount: number;
  lostCount: number;
}

@Injectable()
export class InteractionEngineService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(InteractionEngineService.name);

  constructor(
    @InjectRepository('InteractionMapEntity') private mapRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async extractInteractions(tenantId: string, dto: { cdrId: string; interactionLayer: unknown }): Promise<InteractionMap> {
    const rawInteractions = dto.interactionLayer?.links || [];
    const animations = dto.interactionLayer?.animations || [];
    const transitions = dto.interactionLayer?.transitions || [];

    const elements: InteractionElement[] = [
      ...rawInteractions.map((l: unknown) => ({
        id: l.id || crypto.randomUUID(), type: InteractionType.HYPERLINK,
        sourceElementId: l.sourceId || '', targetRef: l.href || l.target,
        config: { text: l.text }, preservable: true,
      })),
      ...animations.map((a: unknown) => ({
        id: a.id || crypto.randomUUID(), type: InteractionType.ANIMATION,
        sourceElementId: a.targetElementId || '', config: { effect: a.effect, duration: a.duration, trigger: a.trigger },
        preservable: false, fallback: 'static-display',
      })),
      ...transitions.map((t: unknown) => ({
        id: t.id || crypto.randomUUID(), type: InteractionType.TRANSITION,
        sourceElementId: t.slideId || '', config: { type: t.type, duration: t.duration },
        preservable: false, fallback: 'immediate-transition',
      })),
    ];

    const map: InteractionMap = {
      elements,
      totalCount: elements.length,
      preservableCount: elements.reduce((___c, e) => (e.preservable) ? ___c + 1 : ___c, 0),
      lostCount: elements.reduce((___c, e) => (!e.preservable) ? ___c + 1 : ___c, 0),
    };

    await this.mapRepo.save({
      tenantId, cdrId: dto.cdrId, mapJson: JSON.stringify(map),
      totalCount: map.totalCount, preservableCount: map.preservableCount,
    });

    return map;
  }

  async resolveForFormat(tenantId: string, dto: { cdrId: string; targetFormat: string }): Promise<InteractionElement[]> {
    const record = await this.mapRepo.findOne({ where: { tenantId, cdrId: dto.cdrId } });
    if (!record) return [];
    const map: InteractionMap = JSON.parse(record.mapJson);
    return map.elements.map(el => ({
      ...el,
      preservable: this.isPreservableInFormat(el.type, dto.targetFormat),
    }));
  }

  private isPreservableInFormat(type: InteractionType, format: string): boolean {
    const support: Record<string, InteractionType[]> = {
      pdf: [InteractionType.HYPERLINK, InteractionType.BOOKMARK, InteractionType.FORM_FIELD],
      docx: [InteractionType.HYPERLINK, InteractionType.BOOKMARK],
      html: [InteractionType.HYPERLINK, InteractionType.ANIMATION, InteractionType.TRANSITION, InteractionType.TOOLTIP],
      pptx: [InteractionType.HYPERLINK, InteractionType.ANIMATION, InteractionType.TRANSITION],
    };
    return support[format]?.includes(type) ?? false;
  }
}