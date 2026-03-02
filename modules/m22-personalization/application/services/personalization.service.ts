// Rasid v6.4 — Personalization Service — M22
import { BoundedMap } from '../../../../shared/bounded-collections';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface UserPreferences { theme: string; language: string; timezone: string; layout: string; density: string; rtl: boolean; notifications: Record<string, boolean>; }
export interface RecommendationResult { items: Array<{ id: string; type: string; score: number; reason: string }>; algorithm: string; }

@Injectable()
export class PersonalizationService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(PersonalizationService.name);
  private userActivity = new Map<string, Array<{ action: string; resource: string; timestamp: Date }>>();

  constructor(
    @InjectRepository(require('../../domain/entities/personalization.entity').PersonalizationEntity, 'personalization_connection')
    private readonly repo: Repository<unknown>,
    private readonly events: EventEmitter2,
  ) {}

  async getPreferences(userId: string, tenantId: string): Promise<UserPreferences> {
    const entity = await this.repo.findOne({ where: { userId, tenantId } });
    if (!entity) return { theme: 'light', language: 'ar', timezone: 'Asia/Riyadh', layout: 'default', density: 'comfortable', rtl: true, notifications: {} };
    return entity.preferences;
  }

  async setPreferences(userId: string, tenantId: string, preferences: Partial<UserPreferences>) {
    let entity = await this.repo.findOne({ where: { userId, tenantId } });
    if (!entity) entity = this.repo.create({ userId, tenantId, preferences: { theme: 'light', language: 'ar', timezone: 'Asia/Riyadh', layout: 'default', density: 'comfortable', rtl: true, notifications: {}, ...preferences } });
    else entity.preferences = { ...entity.preferences, ...preferences };
    const saved = await this.repo.save(entity);
    this.safeEmit('m22_personal.updated', { tenantId, userId });
    return saved;
  }

  trackActivity(userId: string, tenantId: string, action: string, resource: string) {
    const key = `${tenantId}:${userId}`;
    if (!this.userActivity.has(key)) this.userActivity.set(key, []);
    const activities = this.userActivity.get(key)!;
    activities.push({ action, resource, timestamp: new Date() });
    if (activities.length > 500) this.userActivity.set(key, activities.slice(-250));
  }

  getRecommendations(userId: string, tenantId: string, limit: number = 10): RecommendationResult {
    const key = `${tenantId}:${userId}`;
    const activities = this.userActivity.get(key) || [];
    if (activities.length < 3) return { items: [], algorithm: 'insufficient_data' };

    const resourceFreq = new BoundedMap<string, number>(10_000);
    for (const a of activities) resourceFreq.set(a.resource, (resourceFreq.get(a.resource) || 0) + 1);

    const sorted = [...resourceFreq.entries()].sort((a, b) => b[1] - a[1]);
    const items = sorted.slice(0, limit).map(([resource, freq]) => ({
      id: resource, type: 'frequently_used', score: freq / activities.length,
      reason: `Accessed ${freq} times recently`,
    }));
    return { items, algorithm: 'frequency_based' };
  }

  async findByTenant(tenantId: string) { return this.repo.find({ where: { tenantId } }); }

// Extended personalization capabilities
  async resetPreferences(userId: string, tenantId: string) {
    const entity = await this.repo.findOne({ where: { userId, tenantId } });
    if (entity) {
      entity.preferences = { theme: 'light', language: 'ar', timezone: 'Asia/Riyadh', layout: 'default', density: 'comfortable', rtl: true, notifications: {} };
      return this.repo.save(entity);
    }
    return null;
  }

  getActivitySummary(userId: string, tenantId: string): { totalActions: number; uniqueResources: number; mostActive: string; lastActivity: Date | null } {
    const key = `${tenantId}:${userId}`;
    const activities = this.userActivity.get(key) || [];
    if (activities.length === 0) return { totalActions: 0, uniqueResources: 0, mostActive: '', lastActivity: null };
    const resources = new Set(activities.map(a => a.resource));
    const freq = new BoundedMap<string, number>(10_000);
    for (const a of activities) freq.set(a.action, (freq.get(a.action) || 0) + 1);
    const mostActive = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return { totalActions: activities.length, uniqueResources: resources.size, mostActive, lastActivity: activities[activities.length - 1]?.timestamp || null };
  }

  clearActivity(userId: string, tenantId: string): void {
    this.userActivity.delete(`${tenantId}:${userId}`);
    this.safeEmit('m22_personal.activity_cleared', { tenantId, userId });
  }

  async getNotificationPreferences(userId: string, tenantId: string): Promise<Record<string, boolean>> {
    const prefs = await this.getPreferences(userId, tenantId);
    return prefs.notifications || {};
  }

  async setNotificationPreference(userId: string, tenantId: string, channel: string, enabled: boolean) {
    const prefs = await this.getPreferences(userId, tenantId);
    prefs.notifications = { ...prefs.notifications, [channel]: enabled };
    return this.setPreferences(userId, tenantId, { notifications: prefs.notifications });
  }
}
