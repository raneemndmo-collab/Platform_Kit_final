// ═══════════════════════════════════════════════════════════════════════════════
// محرك مراقبة الأداء — Performance Monitor Engine
// رصيد v6.4 — مراقبة وتنبيه في الوقت الفعلي
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface PerformanceMetric {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
  tenantId: string;
}

export interface AlertRule {
  id: string;
  tenantId: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  severity: AlertSeverity;
  cooldownMs: number;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  tenantId: string;
  severity: AlertSeverity;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  firedAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  cpu: { usage: number; cores: number };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  activeConnections: number;
  requestsPerSecond: number;
  averageLatencyMs: number;
  errorRate: number;
}

export interface TenantMetrics {
  tenantId: string;
  requestCount: number;
  errorCount: number;
  averageLatencyMs: number;
  activeUsers: number;
  dataStorageMB: number;
  lastActivity: Date;
}

@Injectable()
export class PerformanceMonitorEngine {
  private readonly logger = new Logger(PerformanceMonitorEngine.name);
  private readonly metrics = new BoundedMap<string, PerformanceMetric[]>(50000);
  private readonly alertRules = new BoundedMap<string, AlertRule[]>(5000);
  private readonly activeAlerts = new BoundedMap<string, Alert[]>(10000);
  private readonly lastAlertTime = new BoundedMap<string, number>(10000);
  private readonly tenantMetrics = new BoundedMap<string, TenantMetrics>(1000);
  private readonly startTime = Date.now();

  /** تسجيل مقياس أداء */
  recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.tenantId}:${metric.name}`;
    const existing = this.metrics.get(key) || [];
    existing.push(metric);
    // الاحتفاظ بآخر 1000 قياس فقط
    if (existing.length > 1000) existing.splice(0, existing.length - 1000);
    this.metrics.set(key, existing);

    // التحقق من قواعد التنبيه
    this.checkAlertRules(metric);

    // تحديث مقاييس المستأجر
    this.updateTenantMetrics(metric);
  }

  /** تسجيل قاعدة تنبيه */
  registerAlertRule(rule: AlertRule): void {
    this.logger.log(`تسجيل قاعدة تنبيه: ${rule.name} tenant=${rule.tenantId}`);
    const rules = this.alertRules.get(rule.tenantId) || [];
    rules.push(rule);
    this.alertRules.set(rule.tenantId, rules);
  }

  /** الحصول على صحة النظام */
  getSystemHealth(): SystemHealth {
    const allMetrics = [...this.metrics.values()].flat();
    const latencies = allMetrics.filter(m => m.name === 'request_latency').map(m => m.value);
    const errors = allMetrics.filter(m => m.name === 'error_count');
    const requests = allMetrics.filter(m => m.name === 'request_count');

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const errorRate = requests.length > 0
      ? errors.length / requests.length : 0;

    const memUsage = process.memoryUsage();
    return {
      status: errorRate > 0.1 ? 'critical' : errorRate > 0.05 ? 'degraded' : 'healthy',
      uptime: Date.now() - this.startTime,
      cpu: { usage: 0, cores: 1 },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      disk: { used: 0, total: 0, percentage: 0 },
      activeConnections: this.tenantMetrics.size,
      requestsPerSecond: requests.length / Math.max(1, (Date.now() - this.startTime) / 1000),
      averageLatencyMs: avgLatency,
      errorRate,
    };
  }

  /** الحصول على مقاييس مستأجر */
  getTenantMetrics(tenantId: string): TenantMetrics | undefined {
    return this.tenantMetrics.get(tenantId);
  }

  /** الحصول على التنبيهات النشطة */
  getActiveAlerts(tenantId: string): Alert[] {
    return (this.activeAlerts.get(tenantId) || []).filter(a => !a.resolvedAt);
  }

  /** تأكيد تنبيه */
  acknowledgeAlert(tenantId: string, alertId: string): boolean {
    const alerts = this.activeAlerts.get(tenantId) || [];
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.activeAlerts.set(tenantId, alerts);
      return true;
    }
    return false;
  }

  /** حل تنبيه */
  resolveAlert(tenantId: string, alertId: string): boolean {
    const alerts = this.activeAlerts.get(tenantId) || [];
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      this.activeAlerts.set(tenantId, alerts);
      return true;
    }
    return false;
  }

  /** الحصول على تاريخ المقاييس */
  getMetricHistory(tenantId: string, metricName: string, limit = 100): PerformanceMetric[] {
    const key = `${tenantId}:${metricName}`;
    return (this.metrics.get(key) || []).slice(-limit);
  }

  private checkAlertRules(metric: PerformanceMetric): void {
    const rules = (this.alertRules.get(metric.tenantId) || [])
      .filter(r => r.enabled && r.metric === metric.name);

    for (const rule of rules) {
      const triggered = this.evaluateCondition(metric.value, rule.condition, rule.threshold);
      if (triggered) {
        const lastFired = this.lastAlertTime.get(rule.id) || 0;
        if (Date.now() - lastFired > rule.cooldownMs) {
          this.fireAlert(rule, metric);
          this.lastAlertTime.set(rule.id, Date.now());
        }
      }
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private fireAlert(rule: AlertRule, metric: PerformanceMetric): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ruleId: rule.id,
      tenantId: rule.tenantId,
      severity: rule.severity,
      message: `تنبيه: ${rule.name} — القيمة ${metric.value} تجاوزت الحد ${rule.threshold}`,
      metric: metric.name,
      currentValue: metric.value,
      threshold: rule.threshold,
      firedAt: new Date(),
      acknowledged: false,
    };

    const alerts = this.activeAlerts.get(rule.tenantId) || [];
    alerts.push(alert);
    this.activeAlerts.set(rule.tenantId, alerts);
    this.logger.warn(`🚨 ${alert.message}`);
  }

  private updateTenantMetrics(metric: PerformanceMetric): void {
    const existing = this.tenantMetrics.get(metric.tenantId) || {
      tenantId: metric.tenantId,
      requestCount: 0,
      errorCount: 0,
      averageLatencyMs: 0,
      activeUsers: 0,
      dataStorageMB: 0,
      lastActivity: new Date(),
    };

    if (metric.name === 'request_count') existing.requestCount += metric.value;
    if (metric.name === 'error_count') existing.errorCount += metric.value;
    if (metric.name === 'request_latency') {
      existing.averageLatencyMs = (existing.averageLatencyMs + metric.value) / 2;
    }
    existing.lastActivity = new Date();
    this.tenantMetrics.set(metric.tenantId, existing);
  }
}
