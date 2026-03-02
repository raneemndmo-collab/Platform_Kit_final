import { Injectable , Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationPreference, NotificationTemplate } from '../domain/entities';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification, 'm20_connection') private notifRepo: Repository<Notification>,
    @InjectRepository(NotificationPreference, 'm20_connection') private prefRepo: Repository<NotificationPreference>,
    @InjectRepository(NotificationTemplate, 'm20_connection') private templRepo: Repository<NotificationTemplate>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(tenantId: string, data: {
    userId: string; title: string; body?: string; channel: string; category: string;
    priority?: string; sourceModule?: string; sourceEntityId?: string; actionUrl?: string;
  }): Promise<Notification> {
    const pref = await this.prefRepo.findOne({ where: { tenantId, userId: data.userId, category: data.category } });
    if (pref && !pref.isEnabled) return null;

    const notif = await this.notifRepo.save(this.notifRepo.create({ tenantId, ...data, deliveryStatus: 'delivered', deliveredAt: new Date() }));
    this.safeEmit('notification.sent', { tenantId, notificationId: notif.id, userId: data.userId, channel: data.channel });
    return notif;
  }

  async sendBulk(tenantId: string, userIds: string[], data: { title: string; body?: string; channel: string; category: string }): Promise<number> {
    let sent = 0;
    for (const userId of userIds) {
      const result = await this.send(tenantId, { ...data, userId });
      if (result) sent++;
    }
    return sent;
  }

  async getNotifications(tenantId: string, userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const where: Record<string, unknown> = { tenantId, userId };
    if (unreadOnly) where.isRead = false;
    return this.notifRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async markAsRead(tenantId: string, notificationId: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id: notificationId, tenantId, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllRead(tenantId: string, userId: string): Promise<void> {
    await this.notifRepo.update({ tenantId, userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<{ count: number }> {
    const count = await this.notifRepo.count({ where: { tenantId, userId, isRead: false } });
    return { count };
  }

  async setPreference(tenantId: string, data: { userId: string; category: string; channels: unknown; isEnabled: boolean }): Promise<NotificationPreference> {
    const existing = await this.prefRepo.findOne({ where: { tenantId, userId: data.userId, category: data.category } });
    if (existing) { Object.assign(existing, data); return this.prefRepo.save(existing); }
    return this.prefRepo.save(this.prefRepo.create({ tenantId, ...data }));
  }

  async createTemplate(tenantId: string, data: { eventType: string; channel: string; subject: string; bodyTemplate: string; variables?: string[] }): Promise<NotificationTemplate> {
    return this.templRepo.save(this.templRepo.create({ tenantId, ...data }));
  }

  async health(): Promise<{ status: string; database: string }> {
    try { await this.notifRepo.query('SELECT 1'); return { status: 'healthy', database: 'connected' }; }
    catch { return { status: 'unhealthy', database: 'disconnected' }; }
  }
}
