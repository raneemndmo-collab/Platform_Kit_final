// Rasid v6.4 — Health Check Engine
import { BoundedMap } from '../bounded-collections';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string; uptime: number;
  modules: Record<string, ModuleHealth>;
  databases: Record<string, boolean>;
  timestamp: string;
}

export interface ModuleHealth {
  status: 'up' | 'down' | 'degraded';
  latency: number; lastCheck: string; errors: number;
}

export class HealthCheckEngine {
  private startTime = Date.now();
  private moduleStatus = new BoundedMap<string, ModuleHealth>(10_000);

  recordModuleHealth(moduleId: string, status: ModuleHealth): void {
    this.moduleStatus.set(moduleId, status);
  }

  getOverallHealth(): HealthStatus {
    const modules: Record<string, ModuleHealth> = {};
    let unhealthy = 0, degraded = 0;
    for (const [id, health] of this.moduleStatus) {
      modules[id] = health;
      if (health.status === 'down') unhealthy++;
      else if (health.status === 'degraded') degraded++;
    }
    return {
      status: unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy',
      version: '6.4.0', uptime: (Date.now() - this.startTime) / 1000,
      modules, databases: {}, timestamp: new Date().toISOString(),
    };
  }

  isReady(): boolean { return this.getOverallHealth().status !== 'unhealthy'; }
  isLive(): boolean { return true; }
}
