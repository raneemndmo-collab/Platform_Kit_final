// ═══════════════════════════════════════════════════════════════════════════════
// خدمة التنبيهات المتقدمة — Advanced Alerting Service
// رصيد v6.4 — متوافق مع K9 Monitoring
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export type EscalationLevel = 'L1' | 'L2' | 'L3' | 'executive';

export interface EscalationPolicy {
  id: string;
  tenantId: string;
  name: string;
  levels: Array<{
    level: EscalationLevel;
    delayMinutes: number;
    notifyChannels: string[];
    assignees: string[];
  }>;
}

export interface AlertCorrelation {
  id: string;
  tenantId: string;
  alertIds: string[];
  rootCause?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  suggestedActions: string[];
  correlatedAt: Date;
}

export interface HealthDashboard {
  tenantId: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  services: Array<{
    name: string;
    status: 'up' | 'degraded' | 'down';
    latencyMs: number;
    errorRate: number;
    lastCheck: Date;
  }>;
  activeAlerts: number;
  resolvedLast24h: number;
  uptimePercentage: number;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly escalationPolicies = new BoundedMap<string, EscalationPolicy[]>(1000);
  private readonly correlations = new BoundedMap<string, AlertCorrelation[]>(5000);
  private readonly serviceStatus = new BoundedMap<string, Map<string, { status: string; lastCheck: Date; latencyMs: number; errorRate: number }>>(1000);

  /** تسجيل سياسة تصعيد */
  registerEscalationPolicy(policy: EscalationPolicy): void {
    this.logger.log(`تسجيل سياسة تصعيد: ${policy.name} tenant=${policy.tenantId}`);
    const policies = this.escalationPolicies.get(policy.tenantId) || [];
    policies.push(policy);
    this.escalationPolicies.set(policy.tenantId, policies);
  }

  /** ربط التنبيهات المتعلقة */
  correlateAlerts(tenantId: string, alertIds: string[], rootCause?: string): AlertCorrelation {
    const correlation: AlertCorrelation = {
      id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      alertIds,
      rootCause,
      impact: alertIds.length > 5 ? 'critical' : alertIds.length > 3 ? 'high' : 'medium',
      affectedServices: [],
      suggestedActions: rootCause ? [`معالجة السبب الجذري: ${rootCause}`] : ['تحقيق إضافي مطلوب'],
      correlatedAt: new Date(),
    };

    const existing = this.correlations.get(tenantId) || [];
    existing.push(correlation);
    this.correlations.set(tenantId, existing);
    return correlation;
  }

  /** تحديث حالة الخدمة */
  updateServiceStatus(tenantId: string, serviceName: string, status: { status: string; latencyMs: number; errorRate: number }): void {
    const services = this.serviceStatus.get(tenantId) || new Map();
    services.set(serviceName, { ...status, lastCheck: new Date() });
    this.serviceStatus.set(tenantId, services);
  }

  /** الحصول على لوحة الصحة */
  getHealthDashboard(tenantId: string): HealthDashboard {
    const services = this.serviceStatus.get(tenantId) || new Map();
    const serviceList = [...services.entries()].map(([name, s]) => ({
      name,
      status: (s.errorRate > 0.5 ? 'down' : s.errorRate > 0.1 ? 'degraded' : 'up') as 'up' | 'degraded' | 'down',
      latencyMs: s.latencyMs,
      errorRate: s.errorRate,
      lastCheck: s.lastCheck,
    }));

    const downCount = serviceList.filter(s => s.status === 'down').length;
    const degradedCount = serviceList.filter(s => s.status === 'degraded').length;
    const correlations = this.correlations.get(tenantId) || [];

    return {
      tenantId,
      overallStatus: downCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy',
      services: serviceList,
      activeAlerts: correlations.filter(c => !c.rootCause).length,
      resolvedLast24h: correlations.filter(c => c.rootCause && Date.now() - c.correlatedAt.getTime() < 86400000).length,
      uptimePercentage: serviceList.length > 0
        ? (serviceList.filter(s => s.status === 'up').length / serviceList.length) * 100
        : 100,
    };
  }
}
