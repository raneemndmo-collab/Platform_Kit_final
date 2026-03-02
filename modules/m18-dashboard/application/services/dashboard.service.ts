// Rasid v6.4 — Dashboard Builder Service — M18
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DashboardWidget { id: string; type: string; title: string; dataSource: string; position: { x: number; y: number; w: number; h: number }; config: Record<string, unknown>; }

@Injectable()
export class DashboardService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(require('../../domain/entities/dashboard.entity').DashboardEntity, 'dashboard_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: { title: string; description?: string; layout?: string; widgets?: DashboardWidget[] }) {
    const entity = this.repo.create({
      tenantId, title: dto.title, description: dto.description || '',
      layout: dto.layout || 'grid', widgets: dto.widgets || [],
      status: 'draft', sharing: { public: false, sharedWith: [] },
      refreshInterval: 300, filters: [],
    });
    const saved = await this.repo.save(entity);
    this.safeEmit('m18_dashboard.created', { tenantId, dashboardId: saved.id });
    return saved;
  }

  async addWidget(dashboardId: string, tenantId: string, widget: DashboardWidget) {
    const dash = await this.repo.findOne({ where: { id: dashboardId, tenantId } });
    if (!dash) throw new NotFoundException();
    dash.widgets = [...(dash.widgets || []), widget];
    const saved = await this.repo.save(dash);
    this.safeEmit('m18_dashboard.widget_added', { tenantId, dashboardId, widgetId: widget.id, widgetType: widget.type });
    return saved;
  }

  async removeWidget(dashboardId: string, tenantId: string, widgetId: string) {
    const dash = await this.repo.findOne({ where: { id: dashboardId, tenantId } });
    if (!dash) throw new NotFoundException();
    dash.widgets = (dash.widgets || []).filter((w: unknown) => w.id !== widgetId);
    return this.repo.save(dash);
  }

  async updateLayout(dashboardId: string, tenantId: string, widgets: DashboardWidget[]) {
    const dash = await this.repo.findOne({ where: { id: dashboardId, tenantId } });
    if (!dash) throw new NotFoundException();
    dash.widgets = widgets;
    this.safeEmit('m18_dashboard.layout_updated', { tenantId, dashboardId, widgetCount: widgets.length });
    return this.repo.save(dash);
  }

  async clone(dashboardId: string, tenantId: string, newTitle: string) {
    const original = await this.repo.findOne({ where: { id: dashboardId, tenantId } });
    if (!original) throw new NotFoundException();
    const clone = this.repo.create({
      tenantId, title: newTitle, description: `Clone of ${original.title}`,
      layout: original.layout, widgets: JSON.parse(JSON.stringify(original.widgets)),
      status: 'draft', sharing: { public: false, sharedWith: [] },
      refreshInterval: original.refreshInterval, filters: original.filters,
    });
    return this.repo.save(clone);
  }

  async setRefreshInterval(dashboardId: string, tenantId: string, intervalSeconds: number) {
    await this.repo.update({ id: dashboardId, tenantId }, { refreshInterval: intervalSeconds });
    return this.findOne(dashboardId, tenantId);
  }

  async share(dashboardId: string, tenantId: string, sharing: { public: boolean; sharedWith: string[] }) {
    await this.repo.update({ id: dashboardId, tenantId }, { sharing });
    this.safeEmit('m18_dashboard.shared', { tenantId, dashboardId, public: sharing.public });
    return this.findOne(dashboardId, tenantId);
  }

  async findByTenant(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } }); }
  async findOne(id: string, tenantId: string) { return this.repo.findOne({ where: { id, tenantId } }); }
  async delete(id: string, tenantId: string) { const r = await this.repo.delete({ id, tenantId }); return (r.affected || 0) > 0; }
}
