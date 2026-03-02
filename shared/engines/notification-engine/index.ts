// ═══════════════════════════════════════════════════════════════════════════════
// محرك الإشعارات — Notification Engine
// رصيد v6.4 — إشعارات متعددة القنوات مع عزل المستأجر
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'in_app' | 'slack';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  locale: 'ar' | 'en';
  variables: string[];
}

export interface Notification {
  id: string;
  tenantId: string;
  templateId?: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
}

export interface NotificationPreference {
  tenantId: string;
  userId: string;
  channels: Record<NotificationChannel, boolean>;
  quietHours?: { start: string; end: string };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

@Injectable()
export class NotificationEngine {
  private readonly logger = new Logger(NotificationEngine.name);
  private readonly templates = new BoundedMap<string, NotificationTemplate[]>(5000);
  private readonly notifications = new BoundedMap<string, Notification[]>(100000);
  private readonly preferences = new BoundedMap<string, NotificationPreference>(50000);
  private readonly rateLimits = new BoundedMap<string, { count: number; resetAt: number }>(10000);

  registerTemplate(template: NotificationTemplate): NotificationTemplate {
    this.logger.log(`تسجيل قالب إشعار: ${template.name} tenant=${template.tenantId}`);
    const tenantTemplates = this.templates.get(template.tenantId) || [];
    tenantTemplates.push(template);
    this.templates.set(template.tenantId, tenantTemplates);
    return template;
  }

  async send(tenantId: string, notification: Omit<Notification, 'id' | 'tenantId' | 'status' | 'createdAt'>): Promise<Notification> {
    // التحقق من حد المعدل
    const rateKey = `${tenantId}:${notification.recipient}`;
    const rateLimit = this.rateLimits.get(rateKey);
    if (rateLimit && rateLimit.count > 100 && Date.now() < rateLimit.resetAt) {
      throw new Error('تم تجاوز حد الإشعارات');
    }

    const notif: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      status: 'pending',
      createdAt: new Date(),
    };

    // التحقق من تفضيلات المستخدم
    const pref = this.preferences.get(`${tenantId}:${notification.recipient}`);
    if (pref && !pref.channels[notification.channel]) {
      notif.status = 'failed';
      notif.error = 'القناة معطلة بواسطة المستخدم';
    } else {
      try {
        await this.deliver(notif);
        notif.status = 'sent';
        notif.sentAt = new Date();
      } catch (error: any) {
        notif.status = 'failed';
        notif.error = error.message;
      }
    }

    const tenantNotifs = this.notifications.get(tenantId) || [];
    tenantNotifs.push(notif);
    this.notifications.set(tenantId, tenantNotifs);

    // تحديث حد المعدل
    const currentRate = this.rateLimits.get(rateKey) || { count: 0, resetAt: Date.now() + 3600000 };
    currentRate.count++;
    this.rateLimits.set(rateKey, currentRate);

    return notif;
  }

  async sendBulk(tenantId: string, recipients: string[], template: { subject: string; body: string; channel: NotificationChannel; priority: NotificationPriority }): Promise<Notification[]> {
    this.logger.log(`إرسال جماعي: tenant=${tenantId} recipients=${recipients.length}`);
    const results: Notification[] = [];
    for (const recipient of recipients) {
      const notif = await this.send(tenantId, { ...template, recipient, metadata: { bulk: true } });
      results.push(notif);
    }
    return results;
  }

  private async deliver(notification: Notification): Promise<void> {
    this.logger.debug(`تسليم: ${notification.channel} → ${notification.recipient}`);
    // محاكاة التسليم حسب القناة
    switch (notification.channel) {
      case 'email': break;
      case 'sms': break;
      case 'push': break;
      case 'webhook': break;
      case 'in_app': break;
      case 'slack': break;
    }
  }

  setPreference(preference: NotificationPreference): void {
    this.preferences.set(`${preference.tenantId}:${preference.userId}`, preference);
  }

  getNotifications(tenantId: string, recipient?: string, limit = 50): Notification[] {
    const all = this.notifications.get(tenantId) || [];
    const filtered = recipient ? all.filter(n => n.recipient === recipient) : all;
    return filtered.slice(-limit).reverse();
  }

  markAsRead(tenantId: string, notificationId: string): boolean {
    const all = this.notifications.get(tenantId) || [];
    const notif = all.find(n => n.id === notificationId);
    if (notif) {
      notif.status = 'read';
      notif.readAt = new Date();
      return true;
    }
    return false;
  }
}
