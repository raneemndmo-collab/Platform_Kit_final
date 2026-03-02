// Rasid v6.4 — Portal Service — M19
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface PortalPage { id: string; slug: string; title: string; content: unknown; layout: string; published: boolean; order: number; }
export interface PortalTheme { primaryColor: string; accentColor: string; logoUrl?: string; fontFamily: string; rtl: boolean; }

@Injectable()
export class PortalService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(PortalService.name);

  constructor(
    @InjectRepository(require('../../domain/entities/portal.entity').PortalEntity, 'portal_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: { name: string; domain?: string; theme?: Partial<PortalTheme>; pages?: PortalPage[] }) {
    const defaultTheme: PortalTheme = { primaryColor: '#1a73e8', accentColor: '#34a853', fontFamily: 'Noto Sans Arabic', rtl: true, ...dto.theme };
    const entity = this.repo.create({
      tenantId, name: dto.name, domain: dto.domain || '', theme: defaultTheme,
      pages: dto.pages || [], status: 'draft', navigation: [], settings: { seo: {}, analytics: {} },
    });
    const saved = await this.repo.save(entity);
    this.safeEmit('m19_portal.created', { tenantId, portalId: saved.id });
    return saved;
  }

  async addPage(portalId: string, tenantId: string, page: PortalPage) {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) throw new NotFoundException();
    portal.pages = [...(portal.pages || []), page];
    portal.navigation = this.buildNavigation(portal.pages);
    return this.repo.save(portal);
  }

  async publishPage(portalId: string, tenantId: string, pageId: string) {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) throw new NotFoundException();
    portal.pages = (portal.pages || []).map((p: PortalPage) => p.id === pageId ? { ...p, published: true } : p);
    this.safeEmit('m19_portal.page_published', { tenantId, portalId, pageId });
    return this.repo.save(portal);
  }

  async updateTheme(portalId: string, tenantId: string, theme: Partial<PortalTheme>) {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) throw new NotFoundException();
    portal.theme = { ...portal.theme, ...theme };
    this.safeEmit('m19_portal.theme_updated', { tenantId, portalId });
    return this.repo.save(portal);
  }

  async publish(portalId: string, tenantId: string) {
    await this.repo.update({ id: portalId, tenantId }, { status: 'published' });
    this.safeEmit('m19_portal.published', { tenantId, portalId });
    return this.findOne(portalId, tenantId);
  }

  async findByTenant(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } }); }
  async findOne(id: string, tenantId: string) { return this.repo.findOne({ where: { id, tenantId } }); }
  async findByDomain(domain: string) { return this.repo.findOne({ where: { domain, status: 'published' } }); }

  private buildNavigation(pages: PortalPage[]): Array<{ pageId: string; title: string; slug: string; order: number }> {
    return pages.filter(p => p.published).sort((a, b) => a.order - b.order).map(p => ({ pageId: p.id, title: p.title, slug: p.slug, order: p.order }));
  }

// Extended portal capabilities
  async reorderPages(portalId: string, tenantId: string, pageOrder: Array<{ pageId: string; order: number }>) {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) throw new NotFoundException();
    for (const po of pageOrder) {
      portal.pages = (portal.pages || []).map((p: PortalPage) => p.id === po.pageId ? { ...p, order: po.order } : p);
    }
    portal.navigation = this.buildNavigation(portal.pages);
    return this.repo.save(portal);
  }

  async setSeoSettings(portalId: string, tenantId: string, seo: { title: string; description: string; keywords: string[] }) {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) throw new NotFoundException();
    portal.settings = { ...portal.settings, seo };
    return this.repo.save(portal);
  }

  async enableAnalytics(portalId: string, tenantId: string, trackingId: string) {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) throw new NotFoundException();
    portal.settings = { ...portal.settings, analytics: { enabled: true, trackingId } };
    this.safeEmit('m19_portal.analytics_enabled', { tenantId, portalId });
    return this.repo.save(portal);
  }

  async getPublishedPages(portalId: string, tenantId: string): Promise<PortalPage[]> {
    const portal = await this.repo.findOne({ where: { id: portalId, tenantId } });
    if (!portal) return [];
    return (portal.pages || []).filter((p: PortalPage) => p.published).sort((a: PortalPage, b: PortalPage) => a.order - b.order);
  }

  async unpublish(portalId: string, tenantId: string) {
    await this.repo.update({ id: portalId, tenantId }, { status: 'draft' });
    this.safeEmit('m19_portal.unpublished', { tenantId, portalId });
    return this.findOne(portalId, tenantId);
  }
}
