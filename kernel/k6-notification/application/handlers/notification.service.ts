// =============================================================================
// K6: Notification Service
// Constitutional Reference: K6 Contract
// Template-driven notification dispatch with preference checking
// =============================================================================

import {
  Injectable, Logger, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationTemplateEntity, NotificationDeliveryEntity, NotificationPreferenceEntity,
} from '../../domain/entities';

@Injectable()
export class K6NotificationService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(K6NotificationService.name);

  constructor(
    @InjectRepository(NotificationTemplateEntity, 'k6_connection') private templateRepo: Repository<NotificationTemplateEntity>,
    @InjectRepository(NotificationDeliveryEntity, 'k6_connection') private deliveryRepo: Repository<NotificationDeliveryEntity>,
    @InjectRepository(NotificationPreferenceEntity, 'k6_connection') private prefRepo: Repository<NotificationPreferenceEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Send Notification ──────────────────────────────────────────
  async send(tenantId: string, dto: {
    templateName: string; channel: string; recipientId: string;
    variables?: Record<string, unknown>; correlationId?: string;
  }): Promise<NotificationDeliveryEntity> {
    const template = await this.templateRepo.findOne({
      where: { tenantId, name: dto.templateName, channel: dto.channel, isActive: true },
    });
    if (!template) throw new NotFoundException(`Template '${dto.templateName}' (${dto.channel}) not found`);

    // Check user preference
    const pref = await this.prefRepo.findOne({
      where: { tenantId, userId: dto.recipientId, channel: dto.channel },
    });

    if (pref && !pref.enabled) {
      this.logger.debug(`Notification skipped: user ${dto.recipientId} disabled ${dto.channel}`);
      return null;
    }

    if (pref?.mutedTemplates?.includes(template.name)) {
      this.logger.debug(`Notification skipped: template ${template.name} muted`);
      return null;
    }

    // Render template
    const variables = dto.variables || {};
    const renderedSubject = this.renderTemplate(template.subject, variables);
    const renderedBody = this.renderTemplate(template.bodyTemplate, variables);

    const delivery = this.deliveryRepo.create({
      tenantId, templateId: template.id, recipientId: dto.recipientId,
      channel: dto.channel, variables, renderedSubject, renderedBody,
      status: 'pending', correlationId: dto.correlationId,
    });
    const saved = await this.deliveryRepo.save(delivery);

    // Dispatch (async — actual delivery via channel adapters)
    this.safeEmit('notify.dispatch', {
      deliveryId: saved.id, tenantId, channel: dto.channel,
      recipientId: dto.recipientId, subject: renderedSubject, body: renderedBody,
    });

    // Mark as sent
    saved.status = 'sent';
    saved.sentAt = new Date();
    await this.deliveryRepo.save(saved);

    this.safeEmit('notify.delivered', {
      tenantId, deliveryId: saved.id, channel: dto.channel,
      recipientId: dto.recipientId, templateName: dto.templateName,
    });

    return saved;
  }

  private renderTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`
    );
  }

  // ─── Template Management ────────────────────────────────────────
  async createTemplate(tenantId: string, createdBy: string, dto: {
    name: string; moduleId: string; channel: string;
    subject: string; bodyTemplate: string; variables?: string[];
    locale?: string;
  }): Promise<NotificationTemplateEntity> {
    const existing = await this.templateRepo.findOne({
      where: { tenantId, name: dto.name, channel: dto.channel },
    });
    if (existing) throw new ConflictException(`Template '${dto.name}' (${dto.channel}) already exists`);

    const template = this.templateRepo.create({
      tenantId, createdBy, ...dto,
      variables: dto.variables || [], locale: dto.locale || 'ar', isActive: true,
    });
    return this.templateRepo.save(template);
  }

  async getTemplates(tenantId: string, moduleId?: string): Promise<NotificationTemplateEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (moduleId) where.moduleId = moduleId;
    return this.templateRepo.find({ where });
  }

  async updateTemplate(tenantId: string, templateId: string, dto: Partial<{
    subject: string; bodyTemplate: string; variables: string[]; isActive: boolean;
  }>): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepo.findOne({ where: { tenantId, id: templateId } });
    if (!template) throw new NotFoundException('Template not found');
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  // ─── Delivery Tracking ──────────────────────────────────────────
  async getDeliveries(tenantId: string, filters?: {
    recipientId?: string; channel?: string; status?: string; limit?: number;
  }): Promise<NotificationDeliveryEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters?.recipientId) where.recipientId = filters.recipientId;
    if (filters?.channel) where.channel = filters.channel;
    if (filters?.status) where.status = filters.status;
    return this.deliveryRepo.find({
      where, order: { createdAt: 'DESC' }, take: filters?.limit || 50,
    });
  }

  // ─── Preference Management ──────────────────────────────────────
  async setPreference(tenantId: string, userId: string, dto: {
    channel: string; enabled: boolean; mutedTemplates?: string[];
    quietHoursStart?: string; quietHoursEnd?: string;
  }): Promise<NotificationPreferenceEntity> {
    let pref = await this.prefRepo.findOne({
      where: { tenantId, userId, channel: dto.channel },
    });

    if (pref) {
      Object.assign(pref, dto);
    } else {
      pref = this.prefRepo.create({ tenantId, userId, ...dto });
    }
    return this.prefRepo.save(pref);
  }

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferenceEntity[]> {
    return this.prefRepo.find({ where: { tenantId, userId } });
  }

  // ─── Health ─────────────────────────────────────────────────────
  getHealth(): { status: string; module: string } {
    return { status: 'healthy', module: 'K6-Notification' };
  }
}
